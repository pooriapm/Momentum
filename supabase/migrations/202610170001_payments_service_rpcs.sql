begin;

-- Least privilege for payments, matching the rest of the schema: the service
-- role reads payments directly but changes them only through these reviewed
-- functions. The amount always comes from product_prices, never the caller.

revoke insert, update, delete, truncate, references, trigger on public.payments from service_role;
grant select on public.payments to service_role;

-- Records a pending payment for the active IRR membership price. Calling it
-- again with the same provider reference returns the existing row for the same
-- user and refuses a reference that belongs to another account.
create or replace function public.start_payment(
  p_user_id uuid,
  p_provider text,
  p_provider_reference text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_price public.product_prices%rowtype;
  v_existing public.payments%rowtype;
  v_payment_id uuid;
begin
  if p_user_id is null or p_provider not in ('zarinpal', 'bazaar') then
    raise exception 'invalid_payment_arguments' using errcode = '22023';
  end if;

  select * into v_existing
  from public.payments
  where provider = p_provider and provider_reference = p_provider_reference;

  if v_existing.id is not null then
    if v_existing.user_id <> p_user_id then
      raise exception 'payment_owned_elsewhere' using errcode = 'P0001';
    end if;
    return v_existing.id;
  end if;

  select * into v_price
  from public.product_prices
  where product_code = 'membership'
    and market = 'ir'
    and currency = 'IRR'
    and billing_interval = 'month'
    and active
  limit 1;

  if v_price.id is null then
    raise exception 'pricing_unavailable' using errcode = 'P0001';
  end if;

  insert into public.payments (
    user_id, provider, product_price_id, amount_minor, currency, provider_reference
  )
  values (
    p_user_id, p_provider, v_price.id, v_price.amount_minor, 'IRR', p_provider_reference
  )
  returning id into v_payment_id;

  return v_payment_id;
end;
$$;

-- Marks a still-pending payment as failed; paid payments are never changed.
create or replace function public.fail_payment(
  p_payment_id uuid,
  p_failure_code text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.payments
  set status = 'failed',
      failure_code = p_failure_code
  where id = p_payment_id
    and status = 'pending';
end;
$$;

revoke all on function public.start_payment(uuid, text, text) from public, anon, authenticated;
revoke all on function public.fail_payment(uuid, text) from public, anon, authenticated;
grant execute on function public.start_payment(uuid, text, text) to service_role;
grant execute on function public.fail_payment(uuid, text) to service_role;

commit;
