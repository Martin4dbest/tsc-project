-- TSC: Granular administrator permissions
-- Super Admin has full access. Admin access is controlled by assigned permissions.

-- Central permission catalogue.
create table if not exists public.admin_permission_catalog (
  permission_key text primary key,
  module_name text not null,
  permission_name text not null,
  description text not null default '',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- Individual permissions assigned to administrator accounts.
create table if not exists public.admin_user_permissions (
  user_id uuid not null
    references public.profiles(user_id) on delete cascade,
  permission_key text not null
    references public.admin_permission_catalog(permission_key)
    on delete restrict,
  assigned_by uuid
    references auth.users(id) on delete set null,
  assigned_at timestamptz not null default now(),
  primary key (user_id, permission_key)
);

create index if not exists admin_user_permissions_permission_idx
  on public.admin_user_permissions(permission_key);

create index if not exists admin_user_permissions_assigned_by_idx
  on public.admin_user_permissions(assigned_by);

-- Seed the initial TSC permission catalogue.
insert into public.admin_permission_catalog (
  permission_key,
  module_name,
  permission_name,
  description,
  sort_order
)
values
  (
    'dashboard.view',
    'Dashboard',
    'View dashboard',
    'Access the administration dashboard.',
    10
  ),
  (
    'travellers.view',
    'Traveller Management',
    'View travellers',
    'View traveller profiles and account information.',
    20
  ),
  (
    'travellers.manage',
    'Traveller Management',
    'Manage travellers',
    'Manage traveller accounts and account status.',
    21
  ),
  (
    'journeys.view',
    'Journey Monitoring',
    'View journeys',
    'View activated journeys and trip activity.',
    30
  ),
  (
    'journeys.manage',
    'Journey Monitoring',
    'Manage journeys',
    'Manage journey records and trip operations.',
    31
  ),
  (
    'wallet.view',
    'Wallet',
    'View wallets',
    'View traveller wallet balances and wallet activity.',
    40
  ),
  (
    'wallet.manage',
    'Wallet',
    'Manage wallets',
    'Manage permitted wallet operations.',
    41
  ),
  (
    'payments.view',
    'Payments',
    'View payments',
    'View payment records and transaction history.',
    50
  ),
  (
    'payments.manage',
    'Payments',
    'Manage payments',
    'Manage permitted payment operations.',
    51
  ),
  (
    'emergencies.view',
    'Emergency Operations',
    'View emergencies',
    'View SOS alerts and emergency reports.',
    60
  ),
  (
    'emergencies.manage',
    'Emergency Operations',
    'Manage emergencies',
    'Coordinate emergency operations and responses.',
    61
  ),
  (
    'protection.view',
    'Protection',
    'View protection',
    'View travel protection services and coverage information.',
    70
  ),
  (
    'protection.manage',
    'Protection',
    'Manage protection',
    'Manage protection service operations.',
    71
  ),
  (
    'claims.view',
    'Claims',
    'View claims',
    'View claims and compensation records.',
    80
  ),
  (
    'claims.manage',
    'Claims',
    'Manage claims',
    'Process claims and manage claims workflows.',
    81
  ),
  (
    'partners.view',
    'Global Partners',
    'View partners',
    'View hospitals, responders, insurers and other partners.',
    90
  ),
  (
    'partners.manage',
    'Global Partners',
    'Manage partners',
    'Manage partner records and partner relationships.',
    91
  ),
  (
    'analytics.view',
    'Analytics',
    'View analytics',
    'View platform reports, insights and analytics.',
    100
  ),
  (
    'platform.settings.manage',
    'Platform Settings',
    'Manage platform settings',
    'Manage permitted global platform configuration.',
    110
  ),
  (
    'admins.view',
    'Administrator Management',
    'View administrators',
    'View administrator accounts and assigned permissions.',
    120
  ),
  (
    'admins.manage',
    'Administrator Management',
    'Manage administrators',
    'Manage administrator access and account assignments.',
    121
  ),
  (
    'audit_logs.view',
    'Audit Logs',
    'View audit logs',
    'View administrative activity and security audit records.',
    130
  )
on conflict (permission_key) do update
set
  module_name = excluded.module_name,
  permission_name = excluded.permission_name,
  description = excluded.description,
  sort_order = excluded.sort_order;

alter table public.admin_permission_catalog
  enable row level security;

alter table public.admin_user_permissions
  enable row level security;

-- Authenticated users can read the catalogue.
drop policy if exists "Authenticated users can read permission catalogue"
on public.admin_permission_catalog;

create policy "Authenticated users can read permission catalogue"
on public.admin_permission_catalog
for select
to authenticated
using (true);

-- Admins can read their own permissions.
-- Super Admin can read every administrator's permissions.
drop policy if exists "Admins can read permitted assignments"
on public.admin_user_permissions;

create policy "Admins can read permitted assignments"
on public.admin_user_permissions
for select
to authenticated
using (
  user_id = (select auth.uid())
  or (select public.tsc_is_super_admin())
);

revoke all on public.admin_permission_catalog from anon, authenticated;
grant select on public.admin_permission_catalog to authenticated;

revoke all on public.admin_user_permissions from anon, authenticated;
grant select on public.admin_user_permissions to authenticated;

-- Check whether the current active account has a permission.
-- Super Admin automatically has every permission.
create or replace function public.tsc_has_permission(
  p_permission_key text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    public.tsc_is_super_admin()
    or exists (
      select 1
      from public.profiles p
      join public.admin_user_permissions aup
        on aup.user_id = p.user_id
      join public.admin_permission_catalog apc
        on apc.permission_key = aup.permission_key
      where p.user_id = (select auth.uid())
        and p.role = 'admin'
        and p.account_status = 'active'
        and aup.permission_key = p_permission_key
        and apc.is_active = true
    );
$$;

-- Replace all assigned permissions for an existing Admin.
-- Only an active Super Admin can execute this function.
create or replace function public.tsc_set_admin_permissions(
  p_target_user_id uuid,
  p_permission_keys text[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_role text;
  previous_permissions text[];
  new_permissions text[];
begin
  if not public.tsc_is_super_admin() then
    raise exception 'Only the Super Admin can assign administrator permissions'
      using errcode = '42501';
  end if;

  select role
  into target_role
  from public.profiles
  where user_id = p_target_user_id
  for update;

  if not found then
    raise exception 'Target user profile not found';
  end if;

  if target_role <> 'admin' then
    raise exception 'Permissions can only be assigned to Admin accounts';
  end if;

  if exists (
    select 1
    from unnest(
      coalesce(p_permission_keys, array[]::text[])
    ) as requested(permission_key)
    left join public.admin_permission_catalog apc
      on apc.permission_key = requested.permission_key
    where apc.permission_key is null
       or apc.is_active = false
  ) then
    raise exception 'One or more permission keys are invalid or inactive'
      using errcode = '22023';
  end if;

  select coalesce(
    array_agg(aup.permission_key order by aup.permission_key),
    array[]::text[]
  )
  into previous_permissions
  from public.admin_user_permissions aup
  where aup.user_id = p_target_user_id;

  delete from public.admin_user_permissions
  where user_id = p_target_user_id;

  insert into public.admin_user_permissions (
    user_id,
    permission_key,
    assigned_by
  )
  select
    p_target_user_id,
    requested.permission_key,
    auth.uid()
  from (
    select distinct unnest(
      coalesce(p_permission_keys, array[]::text[])
    ) as permission_key
  ) requested;

  select coalesce(
    array_agg(aup.permission_key order by aup.permission_key),
    array[]::text[]
  )
  into new_permissions
  from public.admin_user_permissions aup
  where aup.user_id = p_target_user_id;

  insert into public.admin_audit_logs (
    actor_user_id,
    target_user_id,
    action,
    details
  )
  values (
    auth.uid(),
    p_target_user_id,
    'admin_permissions_changed',
    jsonb_build_object(
      'previous_permissions', previous_permissions,
      'new_permissions', new_permissions
    )
  );
end;
$$;

-- Restrict permission-management functions to authenticated callers.
-- The functions themselves enforce the Super Admin requirement.
revoke all on function public.tsc_has_permission(text) from public;
grant execute on function public.tsc_has_permission(text)
to authenticated;

revoke all on function public.tsc_set_admin_permissions(uuid, text[])
from public;

grant execute on function public.tsc_set_admin_permissions(uuid, text[])
to authenticated;
