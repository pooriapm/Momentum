begin;

-- Prepaid 30-day membership in IRR. The website pays through Zarinpal and the
-- Android app through Cafe Bazaar in-app billing. Neither gateway renews
-- automatically, so every confirmed payment grants exactly one period and the
-- user pays again for the next one. The USD price is left untouched: how the
-- English website sells membership is still undecided.

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  provider text not null check (provider in ('zarinpal', 'bazaar')),
  product_price_id uuid not null references public.product_prices(id) on delete restrict,
  amount_minor bigint not null check (amount_minor > 0),
  currency text not null check (currency = 'IRR'),
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed')),
  -- Zarinpal authority, or the Bazaar purchase token. Unique per provider so a
  -- replayed callback or token can never grant a second period.
  provider_reference text not null check (length(provider_reference) between 8 and 512),
  -- Zarinpal ref_id or Bazaar order id, recorded once the provider confirms.
  provider_receipt text check (provider_receipt is null or length(provider_receipt) <= 256),
  entitlement_id uuid references public.entitlements(id) on delete set null,
  failure_code text check (failure_code is null or failure_code ~ '^[a-z0-9_]{1,64}$'),
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  paid_at timestamptz,
  constraint payments_provider_reference_unique unique (provider, provider_reference),
  constraint payments_paid_has_entitlement check (status <> 'paid' or (entitlement_id is not null and paid_at is not null))
);

create index if not exists payments_user_created_idx on public.payments(user_id, created_at desc);

create trigger payments_set_updated_at
before update on public.payments
for each row execute function public.set_updated_at();

alter table public.payments enable row level security;

-- Users can read their own payment history; every write goes through the
-- payments Edge Function with the service role.
create policy payments_select_own on public.payments
for select to authenticated
using (user_id = auth.uid());

revoke all on public.payments from anon;
revoke insert, update, delete on public.payments from authenticated;
grant select on public.payments to authenticated;
grant all on public.payments to service_role;

-- Confirms a payment and grants one 30-day membership period. Idempotent: a
-- second call for the same payment returns the period granted the first time.
create or replace function public.grant_paid_month(
  p_payment_id uuid,
  p_provider_receipt text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_payment public.payments%rowtype;
  v_price public.product_prices%rowtype;
  v_start timestamptz;
  v_entitlement_id uuid;
  v_period_end timestamptz;
begin
  select * into v_payment
  from public.payments
  where id = p_payment_id
  for update;

  if v_payment.id is null then
    raise exception 'payment_not_found' using errcode = 'P0001';
  end if;

  if v_payment.status = 'paid' then
    select period_end into v_period_end from public.entitlements where id = v_payment.entitlement_id;
    return jsonb_build_object(
      'payment_id', v_payment.id,
      'entitlement_id', v_payment.entitlement_id,
      'period_end', v_period_end,
      'already_granted', true
    );
  end if;

  if v_payment.status <> 'pending' then
    raise exception 'payment_not_pending' using errcode = 'P0001';
  end if;

  select * into v_price from public.product_prices where id = v_payment.product_price_id;

  -- Serialize grants per user so two payments cannot pick the same start.
  perform 1 from public.profiles where user_id = v_payment.user_id for update;

  -- A new period starts when the latest live period ends, so paying early
  -- extends membership instead of overlapping the gift or a paid month.
  select greatest(statement_timestamp(), coalesce(max(period_end), statement_timestamp()))
  into v_start
  from public.entitlements
  where user_id = v_payment.user_id
    and status in ('active', 'grace', 'payment_pending')
    and period_end > statement_timestamp();

  insert into public.entitlements (
    user_id,
    source,
    status,
    period_start,
    period_end,
    plan_generation_limit
  )
  values (
    v_payment.user_id,
    'subscription',
    'active',
    v_start,
    v_start + interval '30 days',
    greatest(v_price.included_plan_generations, 1)
  )
  returning id, period_end into v_entitlement_id, v_period_end;

  update public.payments
  set status = 'paid',
      provider_receipt = left(p_provider_receipt, 256),
      entitlement_id = v_entitlement_id,
      paid_at = statement_timestamp()
  where id = v_payment.id;

  return jsonb_build_object(
    'payment_id', v_payment.id,
    'entitlement_id', v_entitlement_id,
    'period_end', v_period_end,
    'already_granted', false
  );
end;
$$;

revoke all on function public.grant_paid_month(uuid, text) from public, anon, authenticated;
grant execute on function public.grant_paid_month(uuid, text) to service_role;

-- A paid period comes from a confirmed gateway payment, so it never needs a
-- stored payment method. Only subscription periods without a confirmed
-- payment keep the old payment-method gate.
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
      and p.payment_method_status in ('not_collected', 'pending')
      and exists (
        select 1
        from public.entitlements e
        where e.user_id = p.user_id
          and e.source = 'subscription'
          and e.status = 'active'
          and statement_timestamp() >= e.period_start
          and statement_timestamp() < e.period_end
          and not exists (
            select 1
            from public.payments pay
            where pay.entitlement_id = e.id
              and pay.status = 'paid'
          )
      )
  );
$$;

revoke all on function private.payment_method_blocks_paid_generation(uuid)
from public, anon, authenticated;

commit;
