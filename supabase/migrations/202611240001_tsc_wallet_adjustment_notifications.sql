-- Notifications generated from successfully committed admin wallet adjustments.

create table if not exists public.tsc_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete restrict,
  notification_type text not null,
  title text not null,
  message text not null,
  wallet_transaction_id uuid unique
    references public.wallet_transactions(id) on delete restrict,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists tsc_notifications_user_created_idx
  on public.tsc_notifications(user_id, created_at desc);

create index if not exists tsc_notifications_unread_idx
  on public.tsc_notifications(user_id, created_at desc)
  where read_at is null;

alter table public.tsc_notifications enable row level security;

drop policy if exists "Travellers can view their notifications"
  on public.tsc_notifications;

create policy "Travellers can view their notifications"
on public.tsc_notifications
for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "Travellers can mark their notifications read"
  on public.tsc_notifications;

create policy "Travellers can mark their notifications read"
on public.tsc_notifications
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

revoke all on public.tsc_notifications from anon, authenticated;
grant select on public.tsc_notifications to authenticated;
grant update (read_at) on public.tsc_notifications to authenticated;

create or replace function public.tsc_notify_wallet_adjustment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_direction text;
  v_amount text;
  v_title text;
  v_message text;
begin
  if coalesce(new.metadata ->> 'source', '') <> 'admin_adjustment' then
    return new;
  end if;

  v_direction := lower(new.transaction_type);

  if v_direction not in ('credit', 'debit') then
    return new;
  end if;

  v_amount := to_char(
    new.amount_minor::numeric / 100,
    'FM999999999999990.00'
  );

  if v_direction = 'credit' then
    v_title := 'Wallet credited';
    v_message := 'Your TSC wallet has been credited with '
      || new.currency_code || ' ' || v_amount || '.';
  else
    v_title := 'Wallet debited';
    v_message := 'Your TSC wallet has been debited by '
      || new.currency_code || ' ' || v_amount || '.';
  end if;

  if nullif(trim(new.description), '') is not null then
    v_message := v_message || ' Reason: ' || trim(new.description);
  end if;

  insert into public.tsc_notifications (
    user_id,
    notification_type,
    title,
    message,
    wallet_transaction_id
  )
  values (
    new.traveller_id,
    'wallet_' || v_direction,
    v_title,
    v_message,
    new.id
  )
  on conflict (wallet_transaction_id) do nothing;

  return new;
end;
$$;

drop trigger if exists wallet_transaction_adjustment_notification
  on public.wallet_transactions;

create trigger wallet_transaction_adjustment_notification
after insert on public.wallet_transactions
for each row
execute function public.tsc_notify_wallet_adjustment();

revoke all on function public.tsc_notify_wallet_adjustment()
  from public, anon, authenticated;
