-- TSC: Initial authentication, profiles and role-based access control

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  role text not null default 'traveller'
    check (role in ('traveller', 'admin', 'super_admin')),
  account_status text not null default 'active'
    check (account_status in ('active', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_audit_logs (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users(id) on delete set null,
  target_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists profiles_role_idx
  on public.profiles(role);

create index if not exists profiles_status_idx
  on public.profiles(account_status);

create index if not exists admin_audit_logs_created_at_idx
  on public.admin_audit_logs(created_at desc);

-- Automatically maintain updated_at.
create or replace function public.tsc_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;

create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.tsc_set_updated_at();

-- Create a traveller profile whenever a new Auth user registers.
create or replace function public.tsc_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, full_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'phone', '')
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists tsc_on_auth_user_created on auth.users;

create trigger tsc_on_auth_user_created
after insert on auth.users
for each row
execute function public.tsc_handle_new_user();

-- Security-definer helpers prevent recursive profile RLS checks.
create or replace function public.tsc_is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where user_id = (select auth.uid())
      and role in ('admin', 'super_admin')
      and account_status = 'active'
  );
$$;

create or replace function public.tsc_is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where user_id = (select auth.uid())
      and role = 'super_admin'
      and account_status = 'active'
  );
$$;

alter table public.profiles enable row level security;
alter table public.admin_audit_logs enable row level security;

-- Profiles: users can read their own profile; admins can read all profiles.
drop policy if exists "Users and admins can read profiles" on public.profiles;

create policy "Users and admins can read profiles"
on public.profiles
for select
to authenticated
using (
  user_id = (select auth.uid())
  or (select public.tsc_is_admin())
);

-- Users can update only their own permitted profile columns.
drop policy if exists "Users can update own profile" on public.profiles;

create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

-- Never allow public client inserts or deletes on profiles.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (full_name, phone) on public.profiles to authenticated;

-- Audit logs are visible only to the Super Admin.
drop policy if exists "Super admins can read audit logs"
on public.admin_audit_logs;

create policy "Super admins can read audit logs"
on public.admin_audit_logs
for select
to authenticated
using ((select public.tsc_is_super_admin()));

revoke all on public.admin_audit_logs from anon, authenticated;
grant select on public.admin_audit_logs to authenticated;

-- Only an active Super Admin can promote or demote an account
-- between traveller and admin. This function cannot create another
-- Super Admin; that must be done through a controlled database operation.
create or replace function public.tsc_set_admin_role(
  target_user_id uuid,
  new_role text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_role text;
begin
  if not public.tsc_is_super_admin() then
    raise exception 'Only the Super Admin can manage administrator roles'
      using errcode = '42501';
  end if;

  if new_role not in ('traveller', 'admin') then
    raise exception 'Invalid role. Allowed values: traveller, admin'
      using errcode = '22023';
  end if;

  select role into current_role
  from public.profiles
  where user_id = target_user_id
  for update;

  if not found then
    raise exception 'Target user profile not found';
  end if;

  update public.profiles
  set role = new_role
  where user_id = target_user_id;

  insert into public.admin_audit_logs (
    actor_user_id,
    target_user_id,
    action,
    details
  )
  values (
    auth.uid(),
    target_user_id,
    'role_changed',
    jsonb_build_object(
      'previous_role', current_role,
      'new_role', new_role
    )
  );
end;
$$;

revoke all on function public.tsc_set_admin_role(uuid, text) from public;
grant execute on function public.tsc_set_admin_role(uuid, text)
to authenticated;

revoke all on function public.tsc_is_admin() from public;
revoke all on function public.tsc_is_super_admin() from public;
grant execute on function public.tsc_is_admin() to authenticated;
grant execute on function public.tsc_is_super_admin() to authenticated;
