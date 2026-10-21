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
    '31313131-3131-4313-8313-313131313131', 'payer@example.com',
    statement_timestamp(), '{}'::jsonb, '{"locale":"fa-IR","country_code":"IR"}'::jsonb,
    statement_timestamp(), statement_timestamp(), false, false
  ),
  (
    '32323232-3232-4323-8323-323232323232', 'other@example.com',
    statement_timestamp(), '{}'::jsonb, '{"locale":"en-US","country_code":"DE"}'::jsonb,
    statement_timestamp(), statement_timestamp(), false, false
  );

-- Browsers can read their own payments but never write them.
select extensions.ok(
  not has_table_privilege('authenticated', 'public.payments', 'INSERT')
    and not has_table_privilege('authenticated', 'public.payments', 'UPDATE'),
  'browsers cannot create or change payments'
);
select extensions.ok(
  not has_table_privilege('service_role', 'public.payments', 'INSERT')
    and not has_table_privilege('service_role', 'public.payments', 'UPDATE')
    and has_table_privilege('service_role', 'public.payments', 'SELECT'),
  'the service role reads payments and changes them only through reviewed functions'
);
select extensions.ok(
  not has_function_privilege('authenticated', 'public.start_payment(uuid, text, text)', 'EXECUTE')
    and not has_function_privilege('authenticated', 'public.grant_paid_month(uuid, text)', 'EXECUTE'),
  'browsers cannot start or grant payments'
);

create temporary table t_ids(name text primary key, id uuid);
insert into t_ids
select 'first', public.start_payment('31313131-3131-4313-8313-313131313131', 'zarinpal', 'A00000000000000000000000000000000001');

select extensions.is(
  (select amount_minor from public.payments where id = (select id from t_ids where name = 'first')),
  4900000::bigint,
  'the amount comes from the active IRR membership price, not the caller'
);
select extensions.is(
  public.start_payment('31313131-3131-4313-8313-313131313131', 'zarinpal', 'A00000000000000000000000000000000001'),
  (select id from t_ids where name = 'first'),
  'starting the same gateway reference again returns the same payment'
);
select extensions.throws_like(
  $$select public.start_payment('32323232-3232-4323-8323-323232323232', 'zarinpal', 'A00000000000000000000000000000000001')$$,
  '%payment_owned_elsewhere%',
  'a gateway reference cannot be claimed by another account'
);

select extensions.is(
  (public.grant_paid_month((select id from t_ids where name = 'first'), 'ref-1') ->> 'already_granted'),
  'false',
  'a confirmed payment grants a membership period'
);
select extensions.is(
  (public.grant_paid_month((select id from t_ids where name = 'first'), 'ref-1') ->> 'already_granted'),
  'true',
  'confirming the same payment again grants nothing new'
);
select extensions.is(
  (
    select count(*)::integer
    from public.entitlements
    where user_id = '31313131-3131-4313-8313-313131313131'
      and source = 'subscription'
      and period_end - period_start = interval '30 days'
  ),
  1,
  'one payment is exactly one 30-day period'
);

insert into t_ids
select 'second', public.start_payment('31313131-3131-4313-8313-313131313131', 'bazaar', 'bazaar-token-0000000002');
select extensions.lives_ok(
  $$select public.fail_payment((select id from t_ids where name = 'second'), 'cancelled_by_user')$$,
  'a pending payment can be marked failed'
);
select extensions.throws_like(
  $$select public.grant_paid_month((select id from t_ids where name = 'second'), 'late')$$,
  '%payment_not_pending%',
  'a failed payment can never be granted later'
);
select extensions.lives_ok(
  $$select public.fail_payment((select id from t_ids where name = 'first'), 'too_late')$$,
  'marking a paid payment failed is a no-op'
);
select extensions.is(
  (select status from public.payments where id = (select id from t_ids where name = 'first')),
  'paid',
  'a paid payment is never marked failed'
);

select * from extensions.finish();
rollback;
