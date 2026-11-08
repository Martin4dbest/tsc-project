-- TSC: Secure administrator account status management.
-- Only an active Super Admin can activate or suspend an Admin account.

create or replace function public.tsc_set_admin_status(
  p_target_user_id uuid,
  p_new_status text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_role text;
  previous_status text;
begin
  if not public.tsc_is_super_admin() then
    raise exception 'Only the Super Admin can manage administrator status'
      using errcode = '42501';
  end if;

  if p_new_status is null or p_new_status not in ('active', 'suspended') then
    raise exception 'Invalid administrator account status'
      using errcode = '22023';
  end if;

  select role, account_status
  into target_role, previous_status
  from public.profiles
  where user_id = p_target_user_id
  for update;

  if not found then
    raise exception 'Target administrator profile not found';
  end if;

  if target_role <> 'admin' then
    raise exception 'Only Admin accounts can be managed with this function';
  end if;

  if previous_status = p_new_status then
    return;
  end if;

  update public.profiles
  set account_status = p_new_status,
      updated_at = now()
  where user_id = p_target_user_id;

  insert into public.admin_audit_logs (
    actor_user_id,
    target_user_id,
    action,
    details
  )
  values (
    auth.uid(),
    p_target_user_id,
    'admin_status_changed',
    jsonb_build_object(
      'previous_status', previous_status,
      'new_status', p_new_status
    )
  );
end;
$$;

revoke all on function public.tsc_set_admin_status(uuid, text)
from public;

grant execute on function public.tsc_set_admin_status(uuid, text)
to authenticated;
