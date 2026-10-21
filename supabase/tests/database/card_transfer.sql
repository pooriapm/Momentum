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
    '41414141-4141-4414-8414-414141414141', 'card-payer@example.com',
    statement_timestamp(), '{}'::jsonb, '{"locale":"fa-IR","country_code":"IR"}'::jsonb,
    statement_timestamp(), statement_timestamp(), false, false
  ),
  (
    '42424242-4242-4424-8424-424242424242', 'card-admin@example.com',
    statement_timestamp(), '{}'::jsonb, '{"locale":"en-US","country_code":"DE"}'::jsonb,
    statement_timestamp(), statement_timestamp(), false, false
  );

select extensions.ok(
  not has_function_privilege('authenticated', 'public.submit_card_payment(uuid, text)', 'EXECUTE')
    and not has_function_privilege('authenticated', 'public.review_card_payment(uuid, boolean, uuid, text)', 'EXECUTE')
    and not has_function_privilege('authenticated', 'public.register_membership_interest(uuid)', 'EXECUTE'),
  'browsers cannot submit, review, or register interest directly'
);

select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname in ('payment_receipts_select_own', 'payment_receipts_insert_own', 'payment_receipts_delete_own')
  ),
  3,
  'receipt storage is private to each member folder'
);

select extensions.throws_like(
  $$select public.submit_card_payment('41414141-4141-4414-8414-414141414141', '42424242-4242-4424-8424-424242424242/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg')$$,
  '%invalid_receipt%',
  'a receipt must live in the payer''s own folder'
);

create temporary table t_ids(name text primary key, id uuid);
insert into t_ids
select 'first', public.submit_card_payment(
  '41414141-4141-4414-8414-414141414141',
  '41414141-4141-4414-8414-414141414141/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg'
);

select extensions.is(
  (select status || ':' || amount_minor from public.payments where id = (select id from t_ids where name = 'first')),
  'pending:4900000',
  'a submitted receipt waits as pending for the IRR membership price'
);

select extensions.throws_like(
  $$select public.submit_card_payment('41414141-4141-4414-8414-414141414141', '41414141-4141-4414-8414-414141414141/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.jpg')$$,
  '%card_payment_pending%',
  'only one receipt can wait for review at a time'
);

select extensions.is(
  (public.review_card_payment((select id from t_ids where name = 'first'), true, '42424242-4242-4424-8424-424242424242') ->> 'already_granted'),
  'false',
  'approving a receipt grants a membership period'
);
select extensions.is(
  (
    select count(*)::integer from public.entitlements
    where user_id = '41414141-4141-4414-8414-414141414141'
      and source = 'subscription'
      and period_end - period_start = interval '30 days'
  ),
  1,
  'one approved receipt is exactly one 30-day period'
);
select extensions.is(
  (select reviewed_by from public.payments where id = (select id from t_ids where name = 'first')),
  '42424242-4242-4424-8424-424242424242'::uuid,
  'the review records who approved it'
);
select extensions.throws_like(
  $$select public.review_card_payment((select id from t_ids where name = 'first'), false, '42424242-4242-4424-8424-424242424242')$$,
  '%payment_not_pending%',
  'an approved receipt cannot be rejected afterwards'
);

insert into t_ids
select 'second', public.submit_card_payment(
  '41414141-4141-4414-8414-414141414141',
  '41414141-4141-4414-8414-414141414141/cccccccc-cccc-4ccc-8ccc-cccccccccccc.png'
);
select extensions.lives_ok(
  $$select public.review_card_payment((select id from t_ids where name = 'second'), false, '42424242-4242-4424-8424-424242424242')$$,
  'an admin can reject a receipt'
);
select extensions.is(
  (select status || ':' || failure_code from public.payments where id = (select id from t_ids where name = 'second')),
  'failed:card_rejected',
  'a rejected receipt is a failed payment and grants nothing'
);

select extensions.lives_ok(
  $$select public.register_membership_interest('42424242-4242-4424-8424-424242424242')$$,
  'registering interest succeeds'
);
select extensions.isnt(
  (select membership_interest_at from public.profiles where user_id = '42424242-4242-4424-8424-424242424242'),
  null,
  'members outside Iran can register interest'
);

select * from extensions.finish();
rollback;
