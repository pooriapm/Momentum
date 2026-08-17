begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(12);

insert into auth.users(
  id, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, is_sso_user, is_anonymous
) values
  ('66666666-6666-4666-8666-666666666666', 'security-a@example.com', statement_timestamp(),
    '{}'::jsonb, '{"locale":"en-US","country_code":"US"}'::jsonb,
    statement_timestamp(), statement_timestamp(), false, false),
  ('77777777-7777-4777-8777-777777777777', 'security-b@example.com', statement_timestamp(),
    '{}'::jsonb, '{"locale":"fa-IR","country_code":"IR","product_region":"ir"}'::jsonb,
    statement_timestamp(), statement_timestamp(), false, false);

insert into public.goals(
  user_id, goal_type, start_weight_kg, target_weight_kg,
  journey_start_date, target_date, status
) values
  ('66666666-6666-4666-8666-666666666666', 'maintenance', 70, 70, current_date, current_date + 30, 'active'),
  ('77777777-7777-4777-8777-777777777777', 'maintenance', 80, 80, current_date, current_date + 30, 'active');

select extensions.ok(
  not has_schema_privilege('authenticated', 'private', 'USAGE'),
  'authenticated clients cannot access the private audit/idempotency schema'
);
select extensions.ok(
  not has_table_privilege('authenticated', 'public.plan_versions', 'SELECT'),
  'raw immutable plan documents are not exposed to clients'
);
select extensions.ok(
  not has_table_privilege('authenticated', 'public.first_plan_campaigns', 'SELECT'),
  'campaign budget internals are not exposed to clients'
);
select extensions.ok(
  not has_function_privilege(
    'authenticated',
    'public.reserve_ai_request(uuid,text,text,text)',
    'EXECUTE'
  ),
  'clients cannot reserve AI usage directly'
);
select extensions.is(
  (select product_region from public.profiles where user_id = '77777777-7777-4777-8777-777777777777'),
  'ir',
  'Iranian signup metadata locks product_region=ir'
);
select extensions.is(
  (select count(*)::integer from public.product_prices where active and product_code = 'membership'),
  2,
  'one monthly membership SKU is listed for both served markets'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '66666666-6666-4666-8666-666666666666', true);

select extensions.is(
  (select count(*)::integer from public.profiles),
  1,
  'user A sees only their own profile'
);
select extensions.is(
  (select count(*)::integer from public.goals),
  1,
  'user A sees only their own goal'
);
select extensions.lives_ok(
  $$insert into storage.objects(bucket_id, name)
    values ('body-composition', '66666666-6666-4666-8666-666666666666/report.pdf')$$,
  'user A can create an object only in their own private prefix'
);
select extensions.throws_like(
  $$insert into storage.objects(bucket_id, name)
    values ('body-composition', '77777777-7777-4777-8777-777777777777/stolen.pdf')$$,
  '%row-level security policy%',
  'user A cannot write into user B storage prefix'
);
select extensions.is(
  (select count(*)::integer from storage.objects where bucket_id = 'body-composition'),
  1,
  'storage RLS exposes only user A objects'
);

select set_config('request.jwt.claim.sub', '77777777-7777-4777-8777-777777777777', true);
select extensions.is(
  (select count(*)::integer from storage.objects where bucket_id = 'body-composition'),
  0,
  'user B cannot read user A private object'
);

reset role;
select * from extensions.finish();
rollback;
