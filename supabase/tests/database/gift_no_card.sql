begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(2);

insert into auth.users(
  id, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, is_sso_user, is_anonymous
) values (
  '12121212-1212-4212-8212-121212121212', 'gift-no-card@example.com',
  statement_timestamp(), '{}'::jsonb, '{"locale":"en-US","country_code":"US"}'::jsonb,
  statement_timestamp(), statement_timestamp(), false, false
);

update public.profiles
set onboarding_status = 'complete', payment_method_status = 'not_collected'
where user_id = '12121212-1212-4212-8212-121212121212';

insert into public.entitlements(
  user_id, source, status, period_start, period_end,
  plan_generation_limit
) values (
  '12121212-1212-4212-8212-121212121212', 'gift', 'active',
  statement_timestamp() - interval '1 minute', statement_timestamp() + interval '31 days',
  1
);

select extensions.lives_ok(
  $$select public.reserve_ai_request(
    '12121212-1212-4212-8212-121212121212', 'plan_generation',
    'gift-no-card-first-plan', repeat('a', 64)
  )$$,
  'the gifted first plan does not require payment details'
);

update public.entitlements
set source = 'subscription'
where user_id = '12121212-1212-4212-8212-121212121212';

select extensions.throws_like(
  $$select public.reserve_ai_request(
    '12121212-1212-4212-8212-121212121212', 'plan_generation',
    'paid-cycle-without-card', repeat('b', 64)
  )$$,
  '%PAYMENT_METHOD_REQUIRED%',
  'a paid cycle still requires a payment method'
);

select * from extensions.finish();
rollback;
