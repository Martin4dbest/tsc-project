-- Allow scheduling without route verification only when journey fees are disabled.
-- Fee-enabled scheduling continues to require verified states and distance.

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
  v_inter_state_verified boolean := false;
begin
  if v_actor is null then
    raise exception 'Authentication is required.'
      using errcode = '42501';
  end if;

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

  select id, amount_minor, reference, status, metadata
  into v_payment_id, v_amount_minor, v_reference,
       v_payment_status, v_existing_metadata
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
        'balance_after_minor',
          v_existing_metadata->'balance_after_minor'
      );
    end if;

    raise exception 'A fee payment record already exists for this journey.'
      using errcode = '23505';
  end if;

  if v_journey.status <> 'draft' then
    raise exception 'Only draft journeys can be scheduled.'
      using errcode = '22023';
  end if;

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
    raise exception 'Route quote expired. Please try again.'
      using errcode = '22023';
  end if;

  select *
  into v_settings
  from public.tsc_journey_fee_settings
  where id = 1;

  if not found then
    raise exception 'Journey fee settings are unavailable.';
  end if;

  -- Always validate that the quote belongs to the journey.
  if not (
    lower(trim(v_quote.origin_input))
      = lower(trim(v_journey.origin_name))
    or (
      v_journey.origin_address is not null
      and lower(trim(v_quote.origin_input))
        = lower(trim(v_journey.origin_address))
    )
  ) then
    raise exception 'Route quote origin does not match this journey.'
      using errcode = '22023';
  end if;

  if not (
    lower(trim(v_quote.destination_input))
      = lower(trim(v_journey.destination_name))
    or (
      v_journey.destination_address is not null
      and lower(trim(v_quote.destination_input))
        = lower(trim(v_journey.destination_address))
    )
  ) then
    raise exception 'Route quote destination does not match this journey.'
      using errcode = '22023';
  end if;

  -- Strict verification is required whenever fees are enabled.
  if v_settings.enabled then
    if v_quote.origin_state is null
       or trim(v_quote.origin_state) = ''
       or v_quote.destination_state is null
       or trim(v_quote.destination_state) = '' then
      raise exception 'Route verification is missing state information.'
        using errcode = '22023';
    end if;

    if v_quote.distance_meters is null
       or v_quote.distance_meters <= 0 then
      raise exception 'Route verification returned an invalid distance.'
        using errcode = '22023';
    end if;

    v_inter_state_verified :=
      lower(trim(v_quote.origin_state))
      <> lower(trim(v_quote.destination_state));

    if v_quote.inter_state is distinct from v_inter_state_verified then
      raise exception 'Route verification data is inconsistent.'
        using errcode = '22023';
    end if;

    v_quote.fee_required :=
      (
        v_inter_state_verified
        and v_settings.interstate_enabled
      )
      or
      (
        not v_inter_state_verified
        and v_quote.distance_meters
          > (v_settings.intra_state_threshold_km * 1000)
      );

    if v_quote.fee_required then
      v_quote.fee_ngn := v_settings.fee_ngn;
    else
      v_quote.fee_ngn := 0;
    end if;
  else
    -- Fee collection is disabled: no route fee or wallet debit.
    v_inter_state_verified := false;
    v_quote.fee_required := false;
    v_quote.fee_ngn := 0;
  end if;

  v_amount_minor := round(v_quote.fee_ngn * 100)::bigint;

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

  -- Wallet debit is preserved for fee-required journeys.
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
    v_wallet.id := null;
    v_reference :=
      'JNYFREE-' || upper(replace(p_journey_id::text, '-', ''));
    v_wallet_tx_id := null;
  end if;

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
      'route_verified', v_settings.enabled,
      'settings_snapshot', v_quote.settings_snapshot
    )
  )
  returning id into v_payment_id;

  update public.journeys
  set status = 'scheduled'
  where id = p_journey_id
    and traveller_id = v_actor
    and status = 'draft';

  if not found then
    raise exception 'Journey could not be scheduled.';
  end if;

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
      'fee_ngn', v_quote.fee_ngn,
      'route_verified', v_settings.enabled
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
