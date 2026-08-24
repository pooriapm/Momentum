begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(13);

insert into auth.users(
  id,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,
  created_at,updated_at,is_sso_user,is_anonymous
) values (
  '12121212-1212-4212-8212-121212121212','analytics@example.test',statement_timestamp(),
  '{}','{"locale":"en-US","country_code":"US"}',statement_timestamp(),statement_timestamp(),false,false
);

update public.profiles set
  date_of_birth = current_date - interval '30 years',
  locale = 'en-US', timezone = 'UTC', country_code = 'US', product_region = 'intl',
  onboarding_status = 'complete', automation_block_reason = null,
  plan_source_preference = 'momentum',
  health_data_consent_at = statement_timestamp(), health_consent_version = 'health-v1'
where user_id = '12121212-1212-4212-8212-121212121212';

insert into public.plans(user_id,name,status,valid_from,valid_to,locale)
values ('12121212-1212-4212-8212-121212121212','Metrics plan','active',current_date,current_date+6,'en-US');
insert into public.daily_meal_status(user_id,local_date,slot_key,option_key,status,completed_at)
values
  ('12121212-1212-4212-8212-121212121212',current_date,'breakfast','one','completed',statement_timestamp()),
  ('12121212-1212-4212-8212-121212121212',current_date,'lunch','one','completed',statement_timestamp()),
  ('12121212-1212-4212-8212-121212121212',current_date,'dinner','one','completed',statement_timestamp());
insert into public.daily_checkins(user_id,local_date,timezone,energy_score)
values ('12121212-1212-4212-8212-121212121212',current_date,'UTC',3);

select extensions.ok(
  not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='product_events' and column_name='user_id'
  ),
  'product events contain no account identifier column'
);
select extensions.ok(
  not has_table_privilege('authenticated','public.product_events','select,insert,update,delete'),
  'authenticated clients have no direct product-event table access'
);
select extensions.ok(
  not has_function_privilege('authenticated','public.record_product_event(uuid,uuid,jsonb)','execute'),
  'authenticated clients cannot bypass the Edge event boundary'
);
select extensions.lives_ok($$select public.set_analytics_consent(
  '12121212-1212-4212-8212-121212121212',true,'analytics-enable-key-1',repeat('a',64)
)$$,'optional analytics can be enabled');
select extensions.is(
  (select analytics_consent_version from public.profiles where user_id='12121212-1212-4212-8212-121212121212'),
  'analytics-v1','analytics consent is explicitly versioned'
);
select extensions.lives_ok($$select public.record_product_event(
  '12121212-1212-4212-8212-121212121212',gen_random_uuid(),
  '{"event_name":"meaningful_action_completed","locale":"en","product_region":"intl","plan_source":"momentum","surface":"today","action_kind":"meal","outcome":"completed","schema_version":"1.0.0"}'::jsonb
)$$,'an allowlisted categorical event is accepted');
select extensions.throws_ok($$select public.record_product_event(
  '12121212-1212-4212-8212-121212121212',gen_random_uuid(),
  '{"event_name":"meaningful_action_completed","locale":"en","product_region":"intl","plan_source":"momentum","surface":"today","action_kind":"meal","outcome":"completed","schema_version":"1.0.0","email":"analytics@example.test"}'::jsonb
)$$,'22023','invalid_product_event','an identifier field is rejected');
select extensions.is(
  (public.r2_core_metrics(current_date,current_date)->>'safely_activated_accounts')::integer,
  1,'safe activation is computed from protected operational facts'
);
select extensions.is(
  (public.r2_core_metrics(current_date,current_date)->>'wpm3_members')::integer,
  1,'WPM3 is computable without raw health values in event payloads'
);
select extensions.is(
  (public.r2_core_metrics(current_date,current_date)->>'meaningful_actions')::integer,
  3,'aggregate meaningful-action count is exact'
);
select extensions.lives_ok($$select public.set_analytics_consent(
  '12121212-1212-4212-8212-121212121212',false,'analytics-disable-key-1',repeat('b',64)
)$$,'optional analytics can be disabled');
select extensions.is(
  (select analytics_consent_at from public.profiles where user_id='12121212-1212-4212-8212-121212121212'),
  null::timestamptz,'opt-out clears active analytics consent'
);
select extensions.throws_ok($$select public.record_product_event(
  '12121212-1212-4212-8212-121212121212',gen_random_uuid(),
  '{"event_name":"plan_viewed","locale":"en","product_region":"intl","plan_source":"momentum","surface":"plan","action_kind":"plan","outcome":"viewed","schema_version":"1.0.0"}'::jsonb
)$$,'42501','analytics_consent_required','opted-out accounts cannot emit product events');

select * from extensions.finish();
rollback;
