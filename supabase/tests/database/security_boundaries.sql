begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(29);

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

insert into public.onboarding_drafts(user_id, current_step, payload) values
  ('66666666-6666-4666-8666-666666666666', 'profile', '{"owner":"user-a"}'::jsonb),
  ('77777777-7777-4777-8777-777777777777', 'profile', '{"owner":"user-b"}'::jsonb);

insert into storage.objects(bucket_id, name) values
  ('body-composition', '66666666-6666-4666-8666-666666666666/keep.pdf'),
  ('body-composition', '77777777-7777-4777-8777-777777777777/keep.pdf');

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
select extensions.is(
  (select count(*)::integer from public.onboarding_drafts),
  1,
  'user A sees only their own onboarding draft'
);
select extensions.ok(
  not has_table_privilege('authenticated', 'public.profiles', 'UPDATE'),
  'authenticated clients cannot update profiles directly'
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
  2,
  'storage RLS exposes only user A objects'
);
select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname in (
        'body_composition_select_own',
        'body_composition_insert_own',
        'body_composition_update_own',
        'body_composition_delete_own'
      )
  ),
  4,
  'private body-report storage has explicit select, insert, update, and delete policies'
);

select set_config('request.jwt.claim.sub', '77777777-7777-4777-8777-777777777777', true);
select extensions.is(
  (select count(*)::integer from public.profiles),
  1,
  'user B sees only their own profile'
);
select extensions.is(
  (select count(*)::integer from public.goals),
  1,
  'user B sees only their own goal'
);
select extensions.is(
  (select count(*)::integer from public.onboarding_drafts),
  1,
  'user B sees only their own onboarding draft'
);
select extensions.is(
  (select count(*)::integer from storage.objects where bucket_id = 'body-composition'),
  1,
  'user B sees only their own private object'
);

reset role;
set local role anon;
select set_config('request.jwt.claim.sub', '', true);

select extensions.ok(
  not has_table_privilege('anon', 'public.profiles', 'SELECT'),
  'anonymous clients have no read privilege on private profiles'
);
select extensions.ok(
  not has_table_privilege('anon', 'public.goals', 'SELECT'),
  'anonymous clients have no read privilege on private goals'
);
select extensions.ok(
  not has_table_privilege('anon', 'public.onboarding_drafts', 'SELECT'),
  'anonymous clients have no read privilege on onboarding drafts'
);
select extensions.ok(
  not exists (
    select 1
    from pg_catalog.pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname like 'body_composition_%'
      and ('anon' = any(roles) or 'public' = any(roles))
  ),
  'anonymous clients are excluded from every body-report storage policy'
);
select extensions.ok(
  not has_table_privilege('anon', 'public.onboarding_drafts', 'INSERT'),
  'anonymous clients have no write privilege on onboarding data'
);

reset role;
set local role service_role;

select extensions.ok(
  not has_table_privilege('service_role', 'public.profiles', 'SELECT'),
  'service role is denied direct profile-table access'
);
select extensions.ok(
  not has_table_privilege('service_role', 'public.goals', 'SELECT'),
  'service role is denied direct goal-table access'
);
select extensions.ok(
  not has_table_privilege('service_role', 'public.onboarding_drafts', 'SELECT'),
  'service role is denied direct onboarding-table access'
);
select extensions.is(
  (select count(*)::integer from storage.objects where bucket_id = 'body-composition'),
  3,
  'service role can read storage objects across user prefixes'
);
select extensions.is(
  (select public from storage.buckets where id = 'body-composition'),
  false,
  'body-composition storage bucket is private'
);
select extensions.ok(
  has_schema_privilege('service_role', 'private', 'USAGE'),
  'service role can access the private backend schema'
);

reset role;
select * from extensions.finish();
rollback;
