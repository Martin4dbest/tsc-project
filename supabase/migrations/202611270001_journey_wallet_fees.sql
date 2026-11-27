-- TSC journey round-trip wallet fees
-- Wallet amounts are stored in kobo (minor units).
-- Fee is charged once per journey (round trip), at scheduling time only.

-- ============================================================
-- 1. ADMIN FEE SETTINGS
-- ============================================================

create table if not exists public.tsc_journey_fee_settings (
  id smallint primary key default 1 check (id = 1),
  enabled boolean not null default true,
  interstate_enabled boolean not null default true,
  fee_ngn numeric(12,2) not null default 1000 check (fee_ngn >= 0),
  intra_state_threshold_km numeric(12,2) not null default 100
    check (intra_state_threshold_km >= 0),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.tsc_journey_fee_settings (id)
values (1)
on conflict (id) do nothing;

alter table public.tsc_journey_fee_settings enable row level security;

revoke all on public.tsc_journey_fee_settings from anon, authenticated;


-- ============================================================
-- 2. VERIFIED ROUTE QUOTES
-- ============================================================

create table if not exists public.tsc_journey_route_quotes (
  id uuid primary key default gen_random_uuid(),
  traveller_id uuid not null references auth.users(id) on delete cascade,

  origin_input text not null,
  destination_input text not null,

  origin_verified_address text not null,
  destination_verified_address text not null,

  origin_state text not null,
  destination_state text not null,

  origin_latitude double precision not null,
  origin_longitude double precision not null,
  destination_latitude double precision not null,
  destination_longitude double precision not null,

  distance_meters bigint not null check (distance_meters >= 0),
  inter_state boolean not null,
  fee_required boolean not null,
  fee_ngn numeric(12,2) not null check (fee_ngn >= 0),

  settings_snapshot jsonb not null default '{}'::jsonb,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),

  check (origin_latitude between -90 and 90),
  check (destination_latitude between -90 and 90),
  check (origin_longitude between -180 and 180),
  check (destination_longitude between -180 and 180)
);

create index if not exists tsc_journey_quotes_traveller_idx
  on public.tsc_journey_route_quotes (traveller_id, created_at desc);

alter table public.tsc_journey_route_quotes enable row level security;

revoke all on public.tsc_journey_route_quotes from anon, authenticated;


-- ============================================================
-- 3. JOURNEY FEE PAYMENT RECORDS
-- One payment/no-fee record per journey round trip.
-- ============================================================

create table if not exists public.tsc_journey_fee_payments (
  id uuid primary key default gen_random_uuid(),

  journey_id uuid not null unique
    references public.journeys(id) on delete restrict,

  traveller_id uuid not null
    references auth.users(id) on delete restrict,

  quote_id uuid not null unique
    references public.tsc_journey_route_quotes(id) on delete restrict,

  wallet_id uuid references public.wallet_accounts(id) on delete restrict,

  wallet_transaction_id uuid unique
    references public.wallet_transactions(id) on delete restrict,

  amount_minor bigint not null check (amount_minor >= 0),

  currency_code text not null default 'NGN'
    check (currency_code = 'NGN'),

  reference text not null unique,

  status text not null default 'paid'
    check (status in ('paid', 'no_fee')),

  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),

  check (
    (status = 'paid' and amount_minor > 0 and wallet_id is not null
      and wallet_transaction_id is not null)
    or
    (status = 'no_fee' and amount_minor = 0
      and wallet_transaction_id is null)
  )
);

create index if not exists tsc_journey_fee_payments_traveller_idx
  on public.tsc_journey_fee_payments (traveller_id, created_at desc);

alter table public.tsc_journey_fee_payments enable row level security;

revoke all on public.tsc_journey_fee_payments from anon, authenticated;


-- ============================================================
-- 4. JOURNEY STATUS VALIDATION
-- Travellers cannot directly schedule a journey.
-- Admin permission journeys.manage retains the operational override.
-- ============================================================

create or replace function public.tsc_validate_journey_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  valid_transition boolean := false;
  v_payment_exists boolean := false;
begin
  new.updated_at := pg_catalog.now();

  if tg_op = 'INSERT' then
    if auth.uid() is null
       and not public.tsc_has_permission('journeys.manage') then
      raise exception 'Authentication required.'
        using errcode = '42501';
    end if;

    if new.status <> 'draft'
       and not public.tsc_has_permission('journeys.manage') then
      raise exception 'New traveller journeys must begin as drafts.'
        using errcode = '42501';
    end if;

    if auth.uid() is not null
       and new.traveller_id <> auth.uid()
       and not public.tsc_has_permission('journeys.manage') then
      raise exception 'You cannot create a journey for another traveller.'
        using errcode = '42501';
    end if;

    return new;
  end if;

  if new.traveller_id is distinct from old.traveller_id then
    raise exception 'Journey ownership cannot be changed.'
      using errcode = '42501';
  end if;

  if new.status is distinct from old.status then
    if auth.uid() is null then
      raise exception 'Authentication required.'
        using errcode = '42501';
    end if;

    if auth.uid() <> old.traveller_id
       and not public.tsc_has_permission('journeys.manage') then
      raise exception 'You are not permitted to change this journey status.'
        using errcode = '42501';
    end if;

    valid_transition :=
      (old.status = 'draft'
        and new.status in ('scheduled', 'cancelled'))
      or
      (old.status = 'scheduled'
        and new.status in ('active', 'cancelled'))
      or
      (old.status = 'active'
        and new.status in ('completed', 'cancelled'));

    if not valid_transition then
      raise exception 'Invalid journey status transition: % to %.',
        old.status, new.status
        using errcode = '22023';
    end if;

    -- Traveller scheduling requires a payment/no-fee record.
    -- Admins with journeys.manage retain the existing override.
    if old.status = 'draft'
       and new.status = 'scheduled'
       and auth.uid() = old.traveller_id
       and not public.tsc_has_permission('journeys.manage') then

      select exists (
        select 1
        from public.tsc_journey_fee_payments p
        where p.journey_id = old.id
          and p.traveller_id = old.traveller_id
          and p.status in ('paid', 'no_fee')
      )
      into v_payment_exists;

      if not v_payment_exists then
        raise exception
          'A verified route quote and fee payment are required before scheduling.'
          using errcode = '42501';
      end if;
    end if;

    if new.status = 'active' then
      new.started_at := coalesce(new.started_at, pg_catalog.now());
    end if;

    if new.status = 'completed' then
      new.completed_at := coalesce(new.completed_at, pg_catalog.now());
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists journeys_validate_update
  on public.journeys;

create trigger journeys_validate_update
before insert or update on public.journeys
for each row
execute function public.tsc_validate_journey_update();


-- ============================================================
-- 5. ATOMIC SCHEDULING + ROUND-TRIP FEE
-- ============================================================

create or replace function public.tsc_schedule_journey_with_fee(
  p_journey_id uuid,
  p_quote_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();

  v_journey public.journeys%rowtype;
  v_quote public.tsc_journey_route_quotes%rowtype;
  v_settings public.tsc_journey_fee_settings%rowtype;
  v_wallet public.wallet_accounts%rowtype;

  v_amount_minor bigint := 0;
  v_balance_after bigint := null;
  v_wallet_tx_id uuid := null;
  v_payment_id uuid;
  v_reference text;
  v_payment_status text;
  v_existing_metadata jsonb;
  v_inter_state_verified boolean;
begin
  if v_actor is null then
    raise exception 'Authentication is required.'
      using errcode = '42501';
  end if;

  -- Lock the journey first.
  select *
  into v_journey
  from public.journeys
  where id = p_journey_id
    and traveller_id = v_actor
  for update;

  if not found then
    raise exception 'Journey not found.'
      using errcode = 'P0002';
  end if;

  -- Idempotent retry protection.
  select id, amount_minor, reference, status, metadata
  into v_payment_id, v_amount_minor, v_reference, v_payment_status, v_existing_metadata
  from public.tsc_journey_fee_payments
  where journey_id = p_journey_id
    and traveller_id = v_actor;

  if found then
    if v_journey.status = 'scheduled' then
      return jsonb_build_object(
        'success', true,
        'already_scheduled', true,
        'payment_id', v_payment_id,
        'amount_minor', v_amount_minor,
        'reference', v_reference,
        'payment_status', v_payment_status,
        'balance_after_minor', v_existing_metadata->'balance_after_minor'
      );
    end if;

    raise exception 'A fee payment record already exists for this journey.'
      using errcode = '23505';
  end if;

  if v_journey.status <> 'draft' then
    raise exception 'Only draft journeys can be scheduled.'
      using errcode = '22023';
  end if;

  -- Lock the quote so it cannot be concurrently consumed.
  select *
  into v_quote
  from public.tsc_journey_route_quotes
  where id = p_quote_id
    and traveller_id = v_actor
  for update;

  if not found then
    raise exception 'Route quote not found for this traveller.'
      using errcode = 'P0002';
  end if;

  if v_quote.consumed_at is not null then
    raise exception 'This route quote has already been used.'
      using errcode = '23505';
  end if;

  if v_quote.expires_at <= pg_catalog.now() then
    raise exception 'Route quote expired. Please verify the route again.'
      using errcode = '22023';
  end if;

  select *
  into v_settings
  from public.tsc_journey_fee_settings
  where id = 1;

  if not found then
    raise exception 'Journey fee settings are unavailable.';
  end if;

  -- Confirm the quote matches either the saved endpoint name or address.
  if not (
    lower(trim(v_quote.origin_input)) = lower(trim(v_journey.origin_name))
    or (v_journey.origin_address is not null and lower(trim(v_quote.origin_input)) = lower(trim(v_journey.origin_address)))
  ) then
    raise exception 'Route quote origin does not match this journey. Please verify the route again.' using errcode = '22023';
  end if;

  if not (
    lower(trim(v_quote.destination_input)) = lower(trim(v_journey.destination_name))
    or (v_journey.destination_address is not null and lower(trim(v_quote.destination_input)) = lower(trim(v_journey.destination_address)))
  ) then
    raise exception 'Route quote destination does not match this journey. Please verify the route again.' using errcode = '22023';
  end if;

  -- Reject missing state data before calculating interstate status.
  if v_quote.origin_state is null or trim(v_quote.origin_state) = ''
     or v_quote.destination_state is null or trim(v_quote.destination_state) = '' then
    raise exception 'Route verification is missing state information. Please verify the route again.' using errcode = '22023';
  end if;

  if v_quote.distance_meters is null or v_quote.distance_meters <= 0 then
    raise exception 'Route verification returned an invalid distance.' using errcode = '22023';
  end if;

  -- Verify interstate classification from verified state names,
  -- rather than trusting the stored boolean alone.
  v_inter_state_verified :=
    lower(trim(v_quote.origin_state))
      <> lower(trim(v_quote.destination_state));

  if v_quote.inter_state is distinct from v_inter_state_verified then
    raise exception 'Route verification data is inconsistent.'
      using errcode = '22023';
  end if;

  -- Recalculate eligibility against current settings at scheduling time.
  v_quote.fee_required :=
    v_settings.enabled
    and (
      (
        v_inter_state_verified
        and v_settings.interstate_enabled
      )
      or
      (
        not v_inter_state_verified
        and v_quote.distance_meters
          > (v_settings.intra_state_threshold_km * 1000)
      )
    );

  if v_quote.fee_required then
    v_quote.fee_ngn := v_settings.fee_ngn;
  else
    v_quote.fee_ngn := 0;
  end if;

  v_amount_minor := round(v_quote.fee_ngn * 100)::bigint;

  -- Mark quote consumed within this transaction.
  update public.tsc_journey_route_quotes
  set consumed_at = pg_catalog.now(),
      fee_required = v_quote.fee_required,
      fee_ngn = v_quote.fee_ngn
  where id = v_quote.id
    and consumed_at is null;

  if not found then
    raise exception 'Route quote could not be consumed.'
      using errcode = '23505';
  end if;

  -- Debit only if the current fee is greater than zero.
  if v_amount_minor > 0 then
    select *
    into v_wallet
    from public.wallet_accounts
    where traveller_id = v_actor
    for update;

    if not found then
      raise exception 'Wallet not found. Please contact support.';
    end if;

    if v_wallet.status <> 'active' then
      raise exception 'Your wallet is frozen and cannot be used.';
    end if;

    if v_wallet.currency_code <> 'NGN' then
      raise exception 'Only NGN wallets are supported for this fee.';
    end if;

    if v_wallet.balance_minor < v_amount_minor then
      raise exception
        'Insufficient wallet balance. Please fund your wallet before scheduling.';
    end if;

    v_balance_after := v_wallet.balance_minor - v_amount_minor;

    update public.wallet_accounts
    set balance_minor = v_balance_after
    where id = v_wallet.id;

    v_reference :=
      'JNYFEE-' || upper(replace(p_journey_id::text, '-', ''));

    insert into public.wallet_transactions (
      wallet_id,
      traveller_id,
      transaction_type,
      amount_minor,
      balance_after_minor,
      currency_code,
      reference,
      description,
      metadata,
      created_by
    )
    values (
      v_wallet.id,
      v_actor,
      'debit',
      v_amount_minor,
      v_balance_after,
      'NGN',
      v_reference,
      'Long-distance journey round-trip fee',
      jsonb_build_object(
        'source', 'journey_fee',
        'journey_id', p_journey_id,
        'route_quote_id', p_quote_id,
        'distance_meters', v_quote.distance_meters,
        'inter_state', v_inter_state_verified,
        'origin_state', v_quote.origin_state,
        'destination_state', v_quote.destination_state,
        'round_trip', true
      ),
      v_actor
    )
    returning id into v_wallet_tx_id;

  else
    -- No wallet is required for a free journey.
    v_wallet.id := null;
    v_reference :=
      'JNYFREE-' || upper(replace(p_journey_id::text, '-', ''));
    v_wallet_tx_id := null;
  end if;

  -- Create the one-time fee/no-fee record.
  insert into public.tsc_journey_fee_payments (
    journey_id,
    traveller_id,
    quote_id,
    wallet_id,
    wallet_transaction_id,
    amount_minor,
    currency_code,
    reference,
    status,
    metadata
  )
  values (
    p_journey_id,
    v_actor,
    p_quote_id,
    v_wallet.id,
    v_wallet_tx_id,
    v_amount_minor,
    'NGN',
    v_reference,
    case
      when v_amount_minor > 0 then 'paid'
      else 'no_fee'
    end,
    jsonb_build_object(
      'distance_meters', v_quote.distance_meters,
      'inter_state', v_inter_state_verified,
      'origin_state', v_quote.origin_state,
      'destination_state', v_quote.destination_state,
      'fee_ngn', v_quote.fee_ngn,
      'balance_after_minor', v_balance_after,
      'round_trip', true,
      'settings_snapshot', v_quote.settings_snapshot
    )
  )
  returning id into v_payment_id;

  -- Schedule the journey in the same transaction.
  update public.journeys
  set status = 'scheduled'
  where id = p_journey_id
    and traveller_id = v_actor
    and status = 'draft';

  if not found then
    raise exception 'Journey could not be scheduled.';
  end if;

  -- Audit trail.
  insert into public.admin_audit_logs (
    actor_user_id,
    target_user_id,
    action,
    details
  )
  values (
    v_actor,
    v_actor,
    'journey.schedule_fee',
    jsonb_build_object(
      'journey_id', p_journey_id,
      'quote_id', p_quote_id,
      'payment_id', v_payment_id,
      'wallet_transaction_id', v_wallet_tx_id,
      'amount_minor', v_amount_minor,
      'reference', v_reference,
      'distance_meters', v_quote.distance_meters,
      'inter_state', v_inter_state_verified,
      'fee_required', v_quote.fee_required,
      'fee_ngn', v_quote.fee_ngn
    )
  );

  return jsonb_build_object(
    'success', true,
    'already_scheduled', false,
    'payment_id', v_payment_id,
    'wallet_transaction_id', v_wallet_tx_id,
    'amount_minor', v_amount_minor,
    'reference', v_reference,
    'payment_status',
      case
        when v_amount_minor > 0 then 'paid'
        else 'no_fee'
      end,
    'balance_after_minor', v_balance_after
  );
end;
$$;

revoke all on function
  public.tsc_schedule_journey_with_fee(uuid, uuid)
  from public, anon;

grant execute on function
  public.tsc_schedule_journey_with_fee(uuid, uuid)
  to authenticated;
