begin;
set local role postgres;
set local search_path = extensions, public;
create extension if not exists pgtap with schema extensions;
select extensions.plan(7);

select extensions.ok(
  not has_function_privilege(
    'authenticated',
    'public.purge_account_owned_rows(uuid)',
    'EXECUTE'
  ),
  'browser cannot purge owned account rows directly'
);
select extensions.ok(
  has_function_privilege(
    'service_role',
    'public.purge_account_owned_rows(uuid)',
    'EXECUTE'
  ),
  'Edge service can purge owned account rows'
);

select extensions.is(
  (
    select coalesce(string_agg(c.table_name, ',' order by c.table_name), '')
    from information_schema.columns c
    join information_schema.tables t
      on t.table_schema = c.table_schema
     and t.table_name = c.table_name
    where c.table_schema = 'public'
      and c.column_name = 'user_id'
      and t.table_type = 'BASE TABLE'
      and c.table_name not in (
        'ai_generation_jobs',
        'ai_safety_reports',
        'body_composition_measurements',
        'daily_checkins',
        'daily_meal_status',
        'deletion_requests',
        'dietary_preferences',
        'entitlements',
        'export_requests',
        'external_plan_imports',
        'extra_food_logs',
        'gift_reservations',
        'goals',
        'health_context',
        'monthly_plan_periods',
        'monthly_plan_snapshots',
        'next_cycle_inputs',
        'onboarding_drafts',
        'plan_versions',
        'plans',
        'profiles',
        'starter_plan_activations',
        'subscriptions',
        'training_schedule_items',
        'usage_ledger',
        'weekly_checkins',
        'workout_exercise_logs',
        'workout_sessions',
        'workout_set_logs'
      )
  ),
  '',
  'every public owner table is in the portable export inventory'
);

insert into auth.users(
  id, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, is_sso_user, is_anonymous
) values
  (
    '2a2a2a2a-2a2a-42a2-82a2-2a2a2a2a2a2a',
    'privacy-cascade@example.com',
    statement_timestamp(),
    '{}'::jsonb,
    '{"locale":"en-US","country_code":"US"}'::jsonb,
    statement_timestamp(),
    statement_timestamp(),
    false,
    false
  ),
  (
    '3a3a3a3a-3a3a-43a3-83a3-3a3a3a3a3a3a',
    'privacy-purge@example.com',
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
) values
  (
    '2b2b2b2b-2b2b-42b2-82b2-2b2b2b2b2b2b',
    '2a2a2a2a-2a2a-42a2-82a2-2a2a2a2a2a2a',
    'admin', 'active',
    statement_timestamp() - interval '1 day',
    statement_timestamp() + interval '30 days',
    1
  ),
  (
    '3b3b3b3b-3b3b-43b3-83b3-3b3b3b3b3b3b',
    '3a3a3a3a-3a3a-43a3-83a3-3a3a3a3a3a3a',
    'admin', 'active',
    statement_timestamp() - interval '1 day',
    statement_timestamp() + interval '30 days',
    1
  );

insert into public.usage_ledger(
  id, user_id, entitlement_id, feature, idempotency_key, request_sha256, status
) values
  (
    '2c2c2c2c-2c2c-42c2-82c2-2c2c2c2c2c2c',
    '2a2a2a2a-2a2a-42a2-82a2-2a2a2a2a2a2a',
    '2b2b2b2b-2b2b-42b2-82b2-2b2b2b2b2b2b',
    'plan_generation', 'privacy-cascade-usage', repeat('d', 64), 'completed'
  ),
  (
    '3c3c3c3c-3c3c-43c3-83c3-3c3c3c3c3c3c',
    '3a3a3a3a-3a3a-43a3-83a3-3a3a3a3a3a3a',
    '3b3b3b3b-3b3b-43b3-83b3-3b3b3b3b3b3b',
    'plan_generation', 'privacy-purge-usage', repeat('e', 64), 'completed'
  );

insert into public.ai_generation_jobs(
  id, user_id, usage_ledger_id, idempotency_key, status, requested_locale,
  requested_days, request_fingerprint, prompt_version, model, product_region
) values
  (
    '2d2d2d2d-2d2d-42d2-82d2-2d2d2d2d2d2d',
    '2a2a2a2a-2a2a-42a2-82a2-2a2a2a2a2a2a',
    '2c2c2c2c-2c2c-42c2-82c2-2c2c2c2c2c2c',
    'privacy-cascade-job', 'completed', 'en-US', 30, repeat('f', 64), 'stub-1', 'stub-monthly', 'intl'
  ),
  (
    '3d3d3d3d-3d3d-43d3-83d3-3d3d3d3d3d3d',
    '3a3a3a3a-3a3a-43a3-83a3-3a3a3a3a3a3a',
    '3c3c3c3c-3c3c-43c3-83c3-3c3c3c3c3c3c',
    'privacy-purge-job', 'completed', 'en-US', 30, repeat('a', 64), 'stub-1', 'stub-monthly', 'intl'
  );

delete from auth.users where id = '2a2a2a2a-2a2a-42a2-82a2-2a2a2a2a2a2a';

select extensions.is(
  (select count(*)::integer from public.usage_ledger where user_id = '2a2a2a2a-2a2a-42a2-82a2-2a2a2a2a2a2a'),
  0,
  'identity cascade removes provider usage ledger rows'
);
select extensions.is(
  (select count(*)::integer from public.ai_generation_jobs where user_id = '2a2a2a2a-2a2a-42a2-82a2-2a2a2a2a2a2a'),
  0,
  'identity cascade removes provider generation jobs'
);

select public.purge_account_owned_rows('3a3a3a3a-3a3a-43a3-83a3-3a3a3a3a3a3a');

select extensions.is(
  (select count(*)::integer from public.usage_ledger where user_id = '3a3a3a3a-3a3a-43a3-83a3-3a3a3a3a3a3a'),
  0,
  'purge removes provider usage while the auth identity still exists'
);
select extensions.is(
  (select count(*)::integer from public.profiles where user_id = '3a3a3a3a-3a3a-43a3-83a3-3a3a3a3a3a3a'),
  1,
  'purge leaves the profile for the Auth identity delete'
);

select * from extensions.finish();
rollback;
