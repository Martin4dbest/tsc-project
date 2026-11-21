-- TSC shared wallet foundation
-- All monetary amounts are stored in minor units (kobo for NGN).

create table if not exists public.wallet_accounts (
  id uuid primary key default gen_random_uuid(),
  traveller_id uuid not null unique
    references public.profiles(user_id) on delete restrict,
  currency_code text not null default 'NGN'
    check (currency_code ~ '^[A-Z]{3}$'),
  balance_minor bigint not null default 0
    check (balance_minor >= 0),
  status text not null default 'active'
    check (status in ('active', 'frozen')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null
    references public.wallet_accounts(id) on delete restrict,
  traveller_id uuid not null
    references public.profiles(user_id) on delete restrict,
  transaction_type text not null
    check (transaction_type in ('credit', 'debit')),
  amount_minor bigint not null check (amount_minor > 0),
  balance_after_minor bigint not null check (balance_after_minor >= 0),
  currency_code text not null default 'NGN'
    check (currency_code ~ '^[A-Z]{3}$'),
  reference text not null unique default (
    'WLT-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16))
  ),
  description text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists wallet_transactions_traveller_created_idx
  on public.wallet_transactions (traveller_id, created_at desc);

create index if not exists wallet_transactions_wallet_created_idx
  on public.wallet_transactions (wallet_id, created_at desc);

create index if not exists wallet_accounts_status_idx
  on public.wallet_accounts (status);

create or replace function public.tsc_wallet_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists wallet_accounts_set_updated_at
  on public.wallet_accounts;

create trigger wallet_accounts_set_updated_at
before update on public.wallet_accounts
for each row execute function public.tsc_wallet_set_updated_at();

-- Create a wallet automatically whenever a traveller profile is created.
create or replace function public.tsc_wallet_create_for_traveller()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role = 'traveller' then
    insert into public.wallet_accounts (traveller_id)
    values (new.user_id)
    on conflict (traveller_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists tsc_wallet_profile_created
  on public.profiles;

create trigger tsc_wallet_profile_created
after insert on public.profiles
for each row execute function public.tsc_wallet_create_for_traveller();

-- Backfill wallets for existing travellers.
insert into public.wallet_accounts (traveller_id)
select p.user_id
from public.profiles p
where p.role = 'traveller'
on conflict (traveller_id) do nothing;

-- Ledger rows are immutable.
create or replace function public.tsc_wallet_prevent_transaction_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Wallet transactions are immutable.';
end;
$$;

drop trigger if exists wallet_transactions_immutable
  on public.wallet_transactions;

create trigger wallet_transactions_immutable
before update or delete on public.wallet_transactions
for each row execute function public.tsc_wallet_prevent_transaction_mutation();

alter table public.wallet_accounts enable row level security;
alter table public.wallet_transactions enable row level security;

drop policy if exists "Travellers read own wallet"
  on public.wallet_accounts;

create policy "Travellers read own wallet"
on public.wallet_accounts
for select
to authenticated
using (traveller_id = (select auth.uid()));

drop policy if exists "Authorized admins read wallets"
  on public.wallet_accounts;

create policy "Authorized admins read wallets"
on public.wallet_accounts
for select
to authenticated
using (
  public.tsc_has_permission('wallet.view')
  or public.tsc_has_permission('wallet.manage')
);

drop policy if exists "Travellers read own wallet transactions"
  on public.wallet_transactions;

create policy "Travellers read own wallet transactions"
on public.wallet_transactions
for select
to authenticated
using (traveller_id = (select auth.uid()));

drop policy if exists "Authorized admins read wallet transactions"
  on public.wallet_transactions;

create policy "Authorized admins read wallet transactions"
on public.wallet_transactions
for select
to authenticated
using (
  public.tsc_has_permission('wallet.view')
  or public.tsc_has_permission('wallet.manage')
);

revoke all on public.wallet_accounts from anon, authenticated;
revoke all on public.wallet_transactions from anon, authenticated;

grant select on public.wallet_accounts to authenticated;
grant select on public.wallet_transactions to authenticated;

-- Admin-only wallet credit/debit operation.
-- The wallet row is locked to prevent concurrent adjustments from racing.
create or replace function public.tsc_wallet_admin_adjust(
  p_traveller_id uuid,
  p_direction text,
  p_amount_minor bigint,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_wallet public.wallet_accounts%rowtype;
  v_new_balance bigint;
  v_transaction_id uuid;
  v_reason text := nullif(trim(p_reason), '');
begin
  if v_actor is null then
    raise exception 'Authentication is required.';
  end if;

  if not public.tsc_has_permission('wallet.manage') then
    raise exception 'You do not have permission to manage wallets.';
  end if;

  if p_direction not in ('credit', 'debit') then
    raise exception 'Direction must be credit or debit.';
  end if;

  if p_amount_minor is null or p_amount_minor <= 0 then
    raise exception 'Amount must be greater than zero.';
  end if;

  if v_reason is null or length(v_reason) < 5 then
    raise exception 'Please provide a reason of at least 5 characters.';
  end if;

  select *
  into v_wallet
  from public.wallet_accounts
  where traveller_id = p_traveller_id
  for update;

  if not found then
    raise exception 'Wallet not found for this traveller.';
  end if;

  if v_wallet.status <> 'active' then
    raise exception 'This wallet is frozen and cannot be adjusted.';
  end if;

  if p_direction = 'credit' then
    if v_wallet.balance_minor > 9223372036854775807 - p_amount_minor then
      raise exception 'The resulting balance is too large.';
    end if;
    v_new_balance := v_wallet.balance_minor + p_amount_minor;
  else
    if v_wallet.balance_minor < p_amount_minor then
      raise exception 'Insufficient wallet balance for this debit.';
    end if;
    v_new_balance := v_wallet.balance_minor - p_amount_minor;
  end if;

  update public.wallet_accounts
  set balance_minor = v_new_balance
  where id = v_wallet.id;

  insert into public.wallet_transactions (
    wallet_id,
    traveller_id,
    transaction_type,
    amount_minor,
    balance_after_minor,
    currency_code,
    description,
    metadata,
    created_by
  )
  values (
    v_wallet.id,
    p_traveller_id,
    p_direction,
    p_amount_minor,
    v_new_balance,
    v_wallet.currency_code,
    v_reason,
    jsonb_build_object('source', 'admin_adjustment'),
    v_actor
  )
  returning id into v_transaction_id;

  insert into public.admin_audit_logs (
    actor_user_id,
    target_user_id,
    action,
    details
  )
  values (
    v_actor,
    p_traveller_id,
    'wallet.' || p_direction,
    jsonb_build_object(
      'wallet_id', v_wallet.id,
      'transaction_id', v_transaction_id,
      'amount_minor', p_amount_minor,
      'currency_code', v_wallet.currency_code,
      'balance_after_minor', v_new_balance,
      'reason', v_reason
    )
  );

  return v_transaction_id;
end;
$$;

revoke all on function public.tsc_wallet_admin_adjust(uuid, text, bigint, text)
  from public, anon;

grant execute on function public.tsc_wallet_admin_adjust(uuid, text, bigint, text)
  to authenticated;
