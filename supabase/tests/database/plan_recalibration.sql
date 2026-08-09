begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(6);

insert into auth.users(
  id, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, is_sso_user, is_anonymous
) values (
  '55555555-5555-4555-8555-555555555555', 'revision-test@example.com',
  statement_timestamp(), '{}'::jsonb, '{"locale":"en-US","country_code":"US"}'::jsonb,
  statement_timestamp(), statement_timestamp(), false, false
);

insert into public.goals(
  id, user_id, goal_type, start_weight_kg, target_weight_kg,
  journey_start_date, target_date, status
) values (
  '55555555-5555-4555-8555-555555555551',
  '55555555-5555-4555-8555-555555555555',
  'maintenance', 75, 75, current_date, current_date + 30, 'active'
);

insert into public.entitlements(
  user_id, source, status, period_start, period_end,
  plan_generation_limit, coach_message_limit, body_composition_extraction_limit
) values (
  '55555555-5555-4555-8555-555555555555', 'admin', 'active',
  statement_timestamp() - interval '1 day', statement_timestamp() + interval '30 days',
  10, 100, 10
);

insert into public.plans(
  id, user_id, goal_id, name, status, valid_from, valid_to, locale
) values (
  '55555555-5555-4555-8555-555555555552',
  '55555555-5555-4555-8555-555555555555',
  '55555555-5555-4555-8555-555555555551',
  'Revision test', 'active', current_date, current_date + 6, 'en-US'
);

insert into public.plan_versions(
  id, plan_id, user_id, version, schema_version, source, content, content_sha256
) values (
  '55555555-5555-4555-8555-555555555553',
  '55555555-5555-4555-8555-555555555552',
  '55555555-5555-4555-8555-555555555555',
  1, '1.1.0', 'admin',
  '{"plan_name":"Original","default_targets":{},"days":[{},{},{}]}'::jsonb,
  repeat('a', 64)
);
update public.plans set active_version_id = '55555555-5555-4555-8555-555555555553'
where id = '55555555-5555-4555-8555-555555555552';

select extensions.lives_ok(
  $$select public.create_plan_recalibration_preview(
    '55555555-5555-4555-8555-555555555555',
    '55555555-5555-4555-8555-555555555552',
    '55555555-5555-4555-8555-555555555553',
    '{"plan_name":"Candidate","default_targets":{},"days":[{},{},{}]}'::jsonb,
    repeat('b', 64), '{"code":"deload"}'::jsonb,
    '{"daily_count":5}'::jsonb, '{"mode":"deload"}'::jsonb,
    'daily_trend', 'preview-revision-test', repeat('c', 64)
  )$$,
  'a candidate version is created as preview'
);

select extensions.is(
  (select status from public.plan_recalibrations where plan_id = '55555555-5555-4555-8555-555555555552'),
  'preview',
  'preview does not activate automatically'
);

select extensions.is(
  (select active_version_id from public.plans where id = '55555555-5555-4555-8555-555555555552'),
  '55555555-5555-4555-8555-555555555553'::uuid,
  'active version remains unchanged before confirmation'
);

select extensions.lives_ok(
  $$select public.confirm_plan_recalibration(
    '55555555-5555-4555-8555-555555555555',
    (select id from public.plan_recalibrations where plan_id = '55555555-5555-4555-8555-555555555552'),
    'confirm-revision-test', repeat('d', 64)
  )$$,
  'preview can be explicitly confirmed'
);

select extensions.lives_ok(
  $$select public.rollback_plan_recalibration(
    '55555555-5555-4555-8555-555555555555',
    (select id from public.plan_recalibrations where plan_id = '55555555-5555-4555-8555-555555555552'),
    'rollback-revision-test', repeat('e', 64)
  )$$,
  'unused active revision can be rolled back'
);

select extensions.is(
  (select active_version_id from public.plans where id = '55555555-5555-4555-8555-555555555552'),
  '55555555-5555-4555-8555-555555555553'::uuid,
  'rollback restores the prior immutable version'
);

select * from extensions.finish();
rollback;
