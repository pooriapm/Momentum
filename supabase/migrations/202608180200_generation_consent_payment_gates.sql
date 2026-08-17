begin;

-- D8: block generation until a payment method is collected (gift cycle 1 included).
-- Stripe checkout is deferred to phase 5a; this gate only enforces the placeholder status.

create or replace function private.payment_method_blocks_paid_generation(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles p
    where p.user_id = p_user_id
      and p.payment_method_status = 'not_collected'
  );
$$;

revoke all on function private.payment_method_blocks_paid_generation(uuid)
from public, anon, authenticated;

create or replace function public.reserve_ai_request(
  p_user_id uuid,
  p_feature text,
  p_idempotency_key text,
  p_request_sha256 text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_entitlement public.entitlements%rowtype;
  v_existing public.usage_ledger%rowtype;
  v_used integer;
  v_limit integer;
  v_reservation public.usage_ledger%rowtype;
begin
  if p_user_id is null
    or p_feature <> 'plan_generation'
    or char_length(p_idempotency_key) not between 8 and 128
    or p_request_sha256 !~ '^[a-f0-9]{64}$'
  then
    raise exception 'invalid_reservation_arguments' using errcode = '22023';
  end if;

  select * into v_existing
  from public.usage_ledger
  where user_id = p_user_id
    and feature = p_feature
    and idempotency_key = p_idempotency_key;

  if v_existing.id is not null then
    if v_existing.request_sha256 <> p_request_sha256 then
      raise exception 'idempotency_key_reused' using errcode = 'P0001';
    end if;
    return jsonb_build_object(
      'reservation_id', v_existing.id,
      'attempt_token', v_existing.attempt_token,
      'state', case v_existing.status when 'reserved' then 'in_progress' else v_existing.status end
    );
  end if;

  if private.payment_method_blocks_paid_generation(p_user_id) then
    raise exception 'PAYMENT_METHOD_REQUIRED' using errcode = 'P0001';
  end if;

  select * into v_entitlement
  from public.entitlements
  where user_id = p_user_id
    and status = 'active'
    and statement_timestamp() >= period_start
    and statement_timestamp() < period_end
  order by period_end desc
  limit 1
  for update;

  if v_entitlement.id is null then
    raise exception 'entitlement_required' using errcode = 'P0001';
  end if;

  v_limit := v_entitlement.plan_generation_limit;

  select coalesce(sum(units), 0)::integer into v_used
  from public.usage_ledger
  where user_id = p_user_id
    and entitlement_id = v_entitlement.id
    and feature = p_feature
    and status in ('reserved', 'completed');

  if v_used >= v_limit then
    raise exception 'quota_exceeded' using errcode = 'P0001';
  end if;

  insert into public.usage_ledger(
    user_id,
    entitlement_id,
    feature,
    idempotency_key,
    request_sha256,
    status,
    units
  ) values (
    p_user_id,
    v_entitlement.id,
    p_feature,
    p_idempotency_key,
    p_request_sha256,
    'reserved',
    1
  )
  returning * into v_reservation;

  return jsonb_build_object(
    'reservation_id', v_reservation.id,
    'attempt_token', v_reservation.attempt_token,
    'state', 'new'
  );
exception
  when unique_violation then
    select * into v_existing
    from public.usage_ledger
    where user_id = p_user_id
      and feature = p_feature
      and idempotency_key = p_idempotency_key;
    if v_existing.id is null then
      raise;
    end if;
    if v_existing.request_sha256 <> p_request_sha256 then
      raise exception 'idempotency_key_reused' using errcode = 'P0001';
    end if;
    return jsonb_build_object(
      'reservation_id', v_existing.id,
      'attempt_token', v_existing.attempt_token,
      'state', case v_existing.status when 'reserved' then 'in_progress' else v_existing.status end
    );
end;
$$;

revoke all on function public.reserve_ai_request(uuid, text, text, text)
from public, anon, authenticated;
grant execute on function public.reserve_ai_request(uuid, text, text, text)
to service_role;

commit;
