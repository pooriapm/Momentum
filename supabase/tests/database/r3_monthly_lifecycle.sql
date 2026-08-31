begin;
set local role postgres;
set local search_path = extensions, public;

create extension if not exists pgtap with schema extensions;
select extensions.plan(13);

insert into auth.users(
  id, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, is_sso_user, is_anonymous
) values
  (
    '31313131-3131-4131-8131-313131313131',
    'r3-one@example.test',
    statement_timestamp(),
    '{}'::jsonb,
    '{"locale":"en-US","country_code":"US","product_region":"intl"}'::jsonb,
    statement_timestamp(), statement_timestamp(), false, false
  ),
  (
    '32323232-3232-4232-8232-323232323232',
    'r3-two@example.test',
    statement_timestamp(),
    '{}'::jsonb,
    '{"locale":"en-US","country_code":"US","product_region":"intl"}'::jsonb,
    statement_timestamp(), statement_timestamp(), false, false
  );

update public.profiles
set onboarding_status = 'complete', product_region = 'intl'
where user_id in (
  '31313131-3131-4131-8131-313131313131',
  '32323232-3232-4232-8232-323232323232'
);

insert into public.entitlements(
  id, user_id, source, status, period_start, period_end, plan_generation_limit
) values (
  '30303030-3030-4030-8030-303030303030',
  '31313131-3131-4131-8131-313131313131',
  'subscription',
  'active',
  statement_timestamp(),
  statement_timestamp() + interval '30 days',
  1
);

select extensions.is(
  private.payment_method_blocks_paid_generation('31313131-3131-4131-8131-313131313131'),
  true,
  'not-collected is a stable paid-generation block'
);

update public.profiles set payment_method_status = 'pending'
where user_id = '31313131-3131-4131-8131-313131313131';
select extensions.is(
  private.payment_method_blocks_paid_generation('31313131-3131-4131-8131-313131313131'),
  true,
  'pending payment method fails closed'
);

update public.profiles set payment_method_status = 'stub_recorded'
where user_id = '31313131-3131-4131-8131-313131313131';
select extensions.is(
  private.payment_method_blocks_paid_generation('31313131-3131-4131-8131-313131313131'),
  false,
  'server-owned stub record opens the paid gate without a live provider'
);

delete from public.entitlements
where id = '30303030-3030-4030-8030-303030303030';

select extensions.lives_ok($$
  insert into public.entitlements(user_id,source,status,period_start,period_end,plan_generation_limit)
  values
    ('31313131-3131-4131-8131-313131313131','subscription','grace',statement_timestamp(),statement_timestamp()+interval '1 day',1),
    ('31313131-3131-4131-8131-313131313131','subscription','payment_pending',statement_timestamp(),statement_timestamp()+interval '1 day',1),
    ('31313131-3131-4131-8131-313131313131','subscription','cancelled',statement_timestamp(),statement_timestamp()+interval '1 day',1),
    ('31313131-3131-4131-8131-313131313131','subscription','expired',statement_timestamp(),statement_timestamp()+interval '1 day',1)
$$, 'grace, pending, cancelled, and expired are durable entitlement states');

update public.first_plan_campaigns
set enabled = true,
    total_budget_usd = 2.50,
    remaining_budget_usd = 2.50,
    reservation_cost_usd = 2.50,
    min_remaining_usd = 0,
    starts_at = null,
    ends_at = null
where id = '20000000-0000-4000-8000-000000000001';

select extensions.is(
  (public.reserve_first_plan_gift('31313131-3131-4131-8131-313131313131')->>'status'),
  'reserved',
  'the first eligible account atomically reserves the final gift budget'
);

select extensions.is(
  (public.reserve_first_plan_gift('31313131-3131-4131-8131-313131313131')->>'idempotent_replay')::boolean,
  true,
  'gift retry returns the existing reservation'
);

select extensions.is(
  (select remaining_budget_usd from public.first_plan_campaigns
   where id = '20000000-0000-4000-8000-000000000001'),
  0.00::numeric,
  'gift replay never decrements budget twice'
);

select extensions.throws_ok(
  $$select public.reserve_first_plan_gift('32323232-3232-4232-8232-323232323232')$$,
  'P0001',
  'gift_budget_unavailable',
  'the next account observes atomic exhaustion'
);

select extensions.is(
  (select status from public.gift_reservations
   where user_id = '31313131-3131-4131-8131-313131313131'),
  'reserved',
  'later exhaustion cannot revoke an existing reservation'
);

insert into public.monthly_plan_periods(
  id, user_id, cycle_index, entitlement_id, status
)
select
  '33333333-3333-4333-8333-333333333333',
  e.user_id,
  1,
  e.id,
  'reserved'
from public.entitlements e
where e.user_id = '31313131-3131-4131-8131-313131313131'
  and e.source = 'gift';

update public.monthly_plan_periods
set status = 'ready',
    ready_at = '2026-01-31T20:15:00Z',
    starts_at = '2026-01-31T20:15:00Z',
    ends_at = '2026-02-28T20:15:00Z'
where id = '33333333-3333-4333-8333-333333333333';

select extensions.is(
  (select period_start from public.entitlements
   where user_id = '31313131-3131-4131-8131-313131313131' and source = 'gift'),
  '2026-01-31T20:15:00Z'::timestamptz,
  'gift entitlement starts at successful import ready_at'
);

select extensions.is(
  (select period_end from public.entitlements
   where user_id = '31313131-3131-4131-8131-313131313131' and source = 'gift'),
  '2026-03-02T20:15:00Z'::timestamptz,
  'gift entitlement ends at the ready_at-derived 30-day boundary'
);

select extensions.has_index(
  'public', 'ai_generation_jobs', 'ai_generation_jobs_one_per_period',
  'one durable generation job is enforced per monthly period'
);

select extensions.has_index(
  'public', 'plan_versions', 'plan_versions_one_per_generation_job',
  'one imported immutable version is enforced per generation job'
);

select * from extensions.finish();
rollback;
