begin;
set local role postgres;
set local search_path = extensions, public;

create extension if not exists pgtap with schema extensions;
select extensions.plan(19);

insert into auth.users(
  id, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, is_sso_user, is_anonymous
) values
  (
    '51515151-5151-4515-8515-515151515151', 'panel-member@example.com',
    statement_timestamp(), '{}'::jsonb, '{"locale":"fa-IR","country_code":"IR"}'::jsonb,
    statement_timestamp(), statement_timestamp(), false, false
  ),
  (
    '52525252-5252-4525-8525-525252525252', 'panel-admin@example.com',
    statement_timestamp(), '{}'::jsonb, '{"locale":"en-US","country_code":"DE"}'::jsonb,
    statement_timestamp(), statement_timestamp(), false, false
  ),
  (
    '53535353-5353-4535-8535-535353535353', 'panel_other@example.com',
    statement_timestamp(), '{}'::jsonb, '{"locale":"en-US","country_code":"DE"}'::jsonb,
    statement_timestamp(), statement_timestamp(), false, false
  );

select extensions.ok(
  not has_function_privilege('authenticated', 'public.admin_overview()', 'EXECUTE')
    and not has_function_privilege('authenticated', 'public.admin_card_history(integer)', 'EXECUTE')
    and not has_function_privilege('authenticated', 'public.admin_find_members(text)', 'EXECUTE')
    and not has_function_privilege('authenticated', 'public.admin_member_detail(uuid)', 'EXECUTE')
    and not has_function_privilege('authenticated', 'public.admin_grant_days(uuid, integer, uuid, text)', 'EXECUTE')
    and not has_function_privilege('authenticated', 'public.admin_membership_waitlist()', 'EXECUTE')
    and not has_function_privilege('authenticated', 'public.review_card_payment(uuid, boolean, uuid, text)', 'EXECUTE')
    and not has_function_privilege('anon', 'public.admin_grant_days(uuid, integer, uuid, text)', 'EXECUTE'),
  'browsers cannot call any admin function directly'
);

select extensions.ok(
  has_function_privilege('service_role', 'public.admin_grant_days(uuid, integer, uuid, text)', 'EXECUTE')
    and has_function_privilege('service_role', 'public.admin_overview()', 'EXECUTE'),
  'the payments function can call the admin functions'
);

-- Search.
select extensions.is(
  (select array_agg(email order by email) from public.admin_find_members('PANEL-')),
  array['panel-admin@example.com', 'panel-member@example.com'],
  'search matches the start of the email, ignoring case'
);
select extensions.is(
  (select count(*)::integer from public.admin_find_members('panel_')),
  1,
  'an underscore in the query is a letter, not a wildcard'
);
select extensions.is(
  (select email from public.admin_find_members('51515151-5151-4515-8515-515151515151')),
  'panel-member@example.com',
  'search also finds an account by its id'
);
select extensions.throws_like(
  $$select * from public.admin_find_members('pa')$$,
  '%invalid_query%',
  'a search needs at least three characters'
);

-- Granting days.
select extensions.throws_like(
  $$select public.admin_grant_days('51515151-5151-4515-8515-515151515151', 91, '52525252-5252-4525-8525-525252525252', 'too many')$$,
  '%invalid_days%',
  'at most 90 days at a time'
);
select extensions.throws_like(
  $$select public.admin_grant_days('51515151-5151-4515-8515-515151515151', 7, '52525252-5252-4525-8525-525252525252', ' ')$$,
  '%invalid_note%',
  'a grant needs a note'
);

create temporary table t_grant as
select public.admin_grant_days('51515151-5151-4515-8515-515151515151', 10, '52525252-5252-4525-8525-525252525252', 'Bank delay') as result;

select extensions.is(
  (
    select (period_end - period_start)::text || ':' || source
    from public.entitlements
    where id = ((select result from t_grant) ->> 'entitlement_id')::uuid
  ),
  '10 days:admin',
  'a grant is an admin period of the given length'
);

select extensions.lives_ok(
  $$select public.admin_grant_days('51515151-5151-4515-8515-515151515151', 5, '52525252-5252-4525-8525-525252525252', 'Second grant')$$,
  'a second grant does not overlap the first'
);
select extensions.is(
  (
    select max(period_end) - min(period_start)
    from public.entitlements
    where user_id = '51515151-5151-4515-8515-515151515151' and source = 'admin'
  ),
  interval '15 days',
  'grants stack one after another'
);
select extensions.is(
  (
    select count(*)::integer from private.account_audit_events
    where user_id = '51515151-5151-4515-8515-515151515151'
      and event_type = 'membership_days_granted'
      and actor_type = 'admin'
      and metadata ->> 'admin_id' = '52525252-5252-4525-8525-525252525252'
  ),
  2,
  'every grant is audited with the admin'
);

-- Rejection with a reason.
create temporary table t_ids(name text primary key, id uuid);
insert into t_ids
select 'receipt', public.submit_card_payment(
  '51515151-5151-4515-8515-515151515151',
  '51515151-5151-4515-8515-515151515151/dddddddd-dddd-4ddd-8ddd-dddddddddddd.jpg'
);
select extensions.throws_like(
  $$select public.review_card_payment((select id from t_ids where name = 'receipt'), false, '52525252-5252-4525-8525-525252525252', 'because')$$,
  '%invalid_reason%',
  'only known rejection reasons are accepted'
);
select extensions.lives_ok(
  $$select public.review_card_payment((select id from t_ids where name = 'receipt'), false, '52525252-5252-4525-8525-525252525252', 'amount_mismatch')$$,
  'an admin can reject with a reason'
);
select extensions.is(
  (select failure_code from public.payments where id = (select id from t_ids where name = 'receipt')),
  'card_amount_mismatch',
  'the member can see why the receipt was rejected'
);
select extensions.is(
  (select status || ':' || coalesce(failure_code, '') || ':' || reviewer_email from public.admin_card_history() where payment_id = (select id from t_ids where name = 'receipt')),
  'failed:card_amount_mismatch:panel-admin@example.com',
  'the history shows the review and who made it'
);

-- Overview, detail and waitlist.
select extensions.ok(
  (public.admin_overview() ->> 'paying_members')::integer >= 1
    and (public.admin_overview() ? 'revenue_last_30_days_irr')
    and (public.admin_overview() ? 'pending_receipts'),
  'the overview counts members and receipts'
);
select extensions.is(
  (
    select jsonb_array_length(detail -> 'entitlements') || ':' || jsonb_array_length(detail -> 'payments')
    from (select public.admin_member_detail('51515151-5151-4515-8515-515151515151') as detail) d
  ),
  '2:1',
  'member detail lists memberships and payments'
);

select public.register_membership_interest('53535353-5353-4535-8535-535353535353');
select extensions.is(
  (select email from public.admin_membership_waitlist() where email like 'panel%'),
  'panel_other@example.com',
  'the waitlist lists members who asked to hear'
);

select * from extensions.finish();
rollback;
