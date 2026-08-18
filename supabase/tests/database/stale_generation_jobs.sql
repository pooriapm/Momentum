begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(7);

insert into auth.users(
  id, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, is_sso_user, is_anonymous
) values (
  '16161616-1616-4161-8161-161616161616',
  'stale-jobs@example.com',
  statement_timestamp(),
  '{}'::jsonb,
  '{"locale":"en-US","country_code":"US"}'::jsonb,
  statement_timestamp(),
  statement_timestamp(),
  false,
  false
);

insert into public.entitlements(
  id, user_id, source, status, period_start, period_end, plan_generation_limit
) values (
  '17171717-1717-4171-8171-171717171717',
  '16161616-1616-4161-8161-161616161616',
  'admin',
  'active',
  statement_timestamp() - interval '1 day',
  statement_timestamp() + interval '30 days',
  1
);

insert into public.usage_ledger(
  id, user_id, entitlement_id, feature, idempotency_key, request_sha256, status, created_at
) values
  (
    '18181818-1818-4181-8181-181818181818',
    '16161616-1616-4161-8161-161616161616',
    '17171717-1717-4171-8171-171717171717',
    'plan_generation',
    'stale-reservation-key',
    repeat('a', 64),
    'reserved',
    statement_timestamp() - interval '20 minutes'
  ),
  (
    '1a1a1a1a-1a1a-41a1-81a1-1a1a1a1a1a1a',
    '16161616-1616-4161-8161-161616161616',
    '17171717-1717-4171-8171-171717171717',
    'plan_generation',
    'fresh-reservation-key',
    repeat('b', 64),
    'reserved',
    statement_timestamp()
  );

insert into public.ai_generation_jobs(
  id, user_id, usage_ledger_id, idempotency_key, status, requested_locale,
  requested_days, request_fingerprint, prompt_version, model, product_region
) values (
  '19191919-1919-4191-8191-191919191919',
  '16161616-1616-4161-8161-161616161616',
  '18181818-1818-4181-8181-181818181818',
  'stale-job-key-01',
  'queued',
  'en-US',
  7,
  repeat('c', 64),
  'stub-1',
  'stub-monthly',
  'intl'
);

select extensions.is(
  (select enabled from public.first_plan_campaigns
    where id = '20000000-0000-4000-8000-000000000001'),
  false,
  'the first-plan gift campaign stays disabled'
);

select extensions.ok(
  not has_function_privilege(
    'authenticated',
    'public.reconcile_stale_generation_jobs(integer)',
    'execute'
  ),
  'clients cannot reconcile stale generation jobs'
);

select extensions.ok(
  not has_function_privilege(
    'authenticated',
    'public.enable_first_plan_campaign(uuid,boolean,numeric,numeric)',
    'execute'
  ),
  'clients cannot enable the gift campaign'
);

select extensions.is(
  public.reconcile_stale_generation_jobs(600),
  1,
  'ops wrapper releases stale reserved usage without calling a provider'
);

select extensions.is(
  (select status from public.usage_ledger where id = '18181818-1818-4181-8181-181818181818'),
  'released',
  'stale reservations are released'
);

select extensions.is(
  (select status from public.ai_generation_jobs where id = '19191919-1919-4191-8191-191919191919'),
  'failed',
  'in-flight jobs tied to stale reservations are marked failed'
);

select extensions.is(
  (select status from public.usage_ledger where id = '1a1a1a1a-1a1a-41a1-81a1-1a1a1a1a1a1a'),
  'reserved',
  'fresh reservations stay reserved'
);

select * from extensions.finish();
rollback;
