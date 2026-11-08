-- TSC: Atomic traveller account status changes and audit logging

create or replace function public.tsc_set_traveller_account_status(
  p_target_user_id uuid,
  p_new_status text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_user_id uuid;
  v_traveller record;
begin
  v_actor_user_id := auth.uid();

  if v_actor_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if coalesce(
    public.tsc_has_permission('travellers.manage'),
    false
  ) is not true then
    raise exception 'Permission denied.';
  end if;

  if p_new_status is null
     or p_new_status not in ('active', 'suspended') then
    raise exception 'Invalid account status.';
  end if;

  select user_id, full_name, account_status
  into v_traveller
  from public.profiles
  where user_id = p_target_user_id
    and role = 'traveller'
  for update;

  if not found then
    raise exception 'Traveller account not found.';
  end if;

  if v_traveller.account_status = p_new_status then
    raise exception 'Traveller already has this account status.';
  end if;

  update public.profiles
  set account_status = p_new_status
  where user_id = p_target_user_id
    and role = 'traveller';

  insert into public.admin_audit_logs (
    actor_user_id,
    target_user_id,
    action,
    details
  )
  values (
    v_actor_user_id,
    p_target_user_id,
    'traveller.account_status_changed',
    pg_catalog.jsonb_build_object(
      'traveller_name', v_traveller.full_name,
      'previous_status', v_traveller.account_status,
      'new_status', p_new_status
    )
  );
end;
$$;

revoke all on function public.tsc_set_traveller_account_status(uuid, text)
from public, anon;

grant execute on function public.tsc_set_traveller_account_status(uuid, text)
to authenticated;
