-- TSC Payment Operations and verified wallet funding.
-- Paystack wallet credits are applied only by the server-side verification RPC.

create table if not exists public.tsc_payment_records (
  id uuid primary key default gen_random_uuid(),
  traveller_id uuid not null references public.profiles(user_id) on delete restrict,
  wallet_id uuid references public.wallet_accounts(id) on delete restrict,
  wallet_transaction_id uuid references public.wallet_transactions(id) on delete restrict,
  provider text not null default 'paystack'
    check (provider in ('paystack', 'wallet', 'admin', 'manual')),
  purpose text not null
    check (purpose in ('wallet_funding', 'service_payment', 'booking_payment', 'refund')),
  status text not null default 'pending'
    check (status in ('pending', 'succeeded', 'failed', 'refunded')),
  amount_minor bigint not null check (amount_minor > 0),
  currency_code text not null default 'NGN'
    check (currency_code = upper(currency_code) and length(currency_code) = 3),
  reference text not null unique,
  provider_transaction_id text unique,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  verified_at timestamptz
);

create index if not exists tsc_payment_records_traveller_created_idx
  on public.tsc_payment_records (traveller_id, created_at desc);

create index if not exists tsc_payment_records_status_created_idx
  on public.tsc_payment_records (status, created_at desc);

create index if not exists tsc_payment_records_purpose_idx
  on public.tsc_payment_records (purpose, created_at desc);

create or replace function public.tsc_payment_records_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists tsc_payment_records_updated_at
  on public.tsc_payment_records;

create trigger tsc_payment_records_updated_at
before update on public.tsc_payment_records
for each row
execute function public.tsc_payment_records_set_updated_at();

alter table public.tsc_payment_records enable row level security;

drop policy if exists "Travellers and authorised admins can view payments"
  on public.tsc_payment_records;

create policy "Travellers and authorised admins can view payments"
on public.tsc_payment_records
for select
to authenticated
using (
  traveller_id = auth.uid()
  or public.tsc_has_permission('payments.view')
  or public.tsc_has_permission('payments.manage')
);

revoke all on public.tsc_payment_records from anon, authenticated;
grant select on public.tsc_payment_records to authenticated;

-- This function is called only by trusted server-side code after Paystack
-- has independently confirmed the transaction amount, currency and status.
create or replace function public.tsc_wallet_credit_verified_paystack(
  p_reference text,
  p_provider_transaction_id text,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.tsc_payment_records%rowtype;
  v_wallet public.wallet_accounts%rowtype;
  v_new_balance bigint;
  v_transaction_id uuid;
begin
  if nullif(trim(p_reference), '') is null then
    raise exception 'Payment reference is required.';
  end if;

  if nullif(trim(p_provider_transaction_id), '') is null then
    raise exception 'Verified provider transaction ID is required.';
  end if;

  select *
  into v_payment
  from public.tsc_payment_records
  where reference = trim(p_reference)
  for update;

  if not found then
    raise exception 'Payment record not found.';
  end if;

  if v_payment.provider <> 'paystack'
     or v_payment.purpose <> 'wallet_funding' then
    raise exception 'This payment is not an eligible Paystack wallet funding transaction.';
  end if;

  -- Repeated webhook or verification calls return the original ledger entry.
  if v_payment.status = 'succeeded' then
    if v_payment.wallet_transaction_id is null then
      raise exception 'Completed payment is missing its wallet ledger entry.';
    end if;

    return v_payment.wallet_transaction_id;
  end if;

  if v_payment.status <> 'pending' then
    raise exception 'This payment is not pending.';
  end if;

  if v_payment.provider_transaction_id is not null
     and v_payment.provider_transaction_id <> trim(p_provider_transaction_id) then
    raise exception 'Provider transaction ID does not match this payment.';
  end if;

  if v_payment.wallet_id is null then
    raise exception 'Payment is not linked to a wallet.';
  end if;

  select *
  into v_wallet
  from public.wallet_accounts
  where id = v_payment.wallet_id
    and traveller_id = v_payment.traveller_id
  for update;

  if not found then
    raise exception 'Wallet not found for this payment.';
  end if;

  if v_wallet.status <> 'active' then
    raise exception 'This wallet is frozen and cannot receive funds.';
  end if;

  if v_wallet.currency_code <> v_payment.currency_code then
    raise exception 'Payment and wallet currencies do not match.';
  end if;

  if v_wallet.balance_minor > 9223372036854775807 - v_payment.amount_minor then
    raise exception 'The resulting wallet balance is too large.';
  end if;

  v_new_balance := v_wallet.balance_minor + v_payment.amount_minor;

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
    reference,
    description,
    metadata
  )
  values (
    v_wallet.id,
    v_payment.traveller_id,
    'credit',
    v_payment.amount_minor,
    v_new_balance,
    v_wallet.currency_code,
    v_payment.reference,
    coalesce(v_payment.description, 'Wallet funding via Paystack'),
    coalesce(v_payment.metadata, '{}'::jsonb)
      || coalesce(p_metadata, '{}'::jsonb)
      || jsonb_build_object(
        'source', 'paystack_wallet_funding',
        'payment_reference', v_payment.reference,
        'provider_transaction_id', trim(p_provider_transaction_id)
      )
  )
  returning id into v_transaction_id;

  update public.tsc_payment_records
  set
    status = 'succeeded',
    provider_transaction_id = trim(p_provider_transaction_id),
    wallet_transaction_id = v_transaction_id,
    verified_at = now(),
    metadata = coalesce(metadata, '{}'::jsonb)
      || coalesce(p_metadata, '{}'::jsonb)
  where id = v_payment.id;

  return v_transaction_id;
end;
$$;

revoke all on function public.tsc_wallet_credit_verified_paystack(text, text, jsonb)
  from public, anon, authenticated;

grant execute on function public.tsc_wallet_credit_verified_paystack(text, text, jsonb)
  to service_role;
