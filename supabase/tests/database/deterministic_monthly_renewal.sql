begin;
set local role postgres;
set local search_path = extensions, public;
create extension if not exists pgtap with schema extensions;
select extensions.plan(26);

create function pg_temp.monthly_fixture(p_name text)
returns jsonb
language sql
immutable
as $fixture$
  select jsonb_build_object(
    'plan_name', p_name,
    'default_targets', '{}'::jsonb,
    'days', jsonb_agg(jsonb_build_object('day_index', day_index) order by day_index)
  )
  from generate_series(0,29) day_index;
$fixture$;

create function pg_temp.renew(p_key text, p_sha text)
returns jsonb
language sql
as $renew$
  select public.persist_deterministic_starter_plan(
    '78787878-7878-4878-8878-787878787871', p_key,
    (select id from public.goals
     where user_id='78787878-7878-4878-8878-787878787871' and status='active'),
    'Starter', current_date, current_date+29, 'en-US', '1.0.0', 'momentum-core@v2',
    'momentum-starter/1.0.0', 'terms-v1', 'privacy-v1', 'health-v1',
    pg_temp.monthly_fixture('Starter'), repeat(p_sha,64)
  );
$renew$;

-- Moves the current cycle back in time so it ends `p_days_left` days from today.
create function pg_temp.age_cycle(p_cycle integer, p_days_left integer)
returns void
language plpgsql
as $age$
declare
  v_period public.monthly_plan_periods%rowtype;
begin
  select * into v_period from public.monthly_plan_periods
  where user_id='78787878-7878-4878-8878-787878787871' and cycle_index=p_cycle;
  update public.plans plan
  set valid_from = current_date + p_days_left - 29, valid_to = current_date + p_days_left
  from public.plan_versions version
  where version.id = v_period.imported_plan_version_id and plan.id = version.plan_id;
  update public.monthly_plan_periods
  set ready_at = statement_timestamp() + make_interval(days => p_days_left - 29),
      starts_at = statement_timestamp() + make_interval(days => p_days_left - 29)
  where id = v_period.id;
end;
$age$;

insert into auth.users(
  id,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,
  created_at,updated_at,is_sso_user,is_anonymous
) values (
  '78787878-7878-4878-8878-787878787871','renewal@example.com',statement_timestamp(),'{}',
  '{"locale":"en-US","country_code":"US"}',statement_timestamp(),statement_timestamp(),false,false
);

insert into public.onboarding_drafts(user_id,current_step,payload) values (
  '78787878-7878-4878-8878-787878787871','review',jsonb_build_object(
    'firstName','Renewal user','birthDate','1990-05-10','sex','undisclosed',
    'heightCm','175','weightKg','75','country','US','planSource','momentum',
    'goalType','maintenance','adultConfirmed','yes','pregnancyOrBreastfeeding','no',
    'eatingDisorderHistory','no','highRiskCondition','no','medicalNotes','none',
    'medications','','supplements','','dietStyle','omnivore','favoriteFoods','rice',
    'dislikedFoods','','allergies','','requestedMealPattern','three meals',
    'preferredOptionCount','1','cookingConstraints','simple meals','foodBudget','standard',
    'restaurantMealsPerWeek','0','restaurantPreferences','','groceryPreferences','weekly',
    'trainingDays','0','workSchedule','weekdays','termsAccepted','yes',
    'privacyAccepted','yes','healthDataConsent','yes','locale','en-US','timezone','UTC'
  )
);

select extensions.lives_ok($$select public.complete_onboarding(
  '78787878-7878-4878-8878-787878787871','renewal-onboarding-key-1',
  'terms-v1','privacy-v1','health-v1'
)$$,'managed onboarding completes');

-- Cycle 1: unchanged first-plan behaviour, now with a lifecycle period.
select extensions.is(
  (pg_temp.renew('renewal-key-cycle-1','a') ->> 'cycle_index')::integer,
  1,
  'the first starter plan is cycle 1'
);
select extensions.ok(
  (select p.status = 'ready' and p.entitlement_id is null and pl.valid_from = current_date
     and pl.valid_to = current_date + 29 and p.ends_at is not null
   from public.monthly_plan_periods p
   join public.plan_versions v on v.id = p.imported_plan_version_id
   join public.plans pl on pl.id = v.plan_id
   where p.user_id='78787878-7878-4878-8878-787878787871' and p.cycle_index=1),
  'cycle 1 records a ready period for the starter version, without a membership'
);
select extensions.is(
  pg_temp.renew('renewal-key-cycle-1b','a') ->> 'plan_version_id',
  (select imported_plan_version_id::text from public.monthly_plan_periods
   where user_id='78787878-7878-4878-8878-787878787871' and cycle_index=1),
  'a new key during cycle 1 returns the cycle 1 plan'
);
select extensions.is(
  (select count(*) from public.plans where user_id='78787878-7878-4878-8878-787878787871'),
  1::bigint,
  'repeating during cycle 1 creates no plan'
);

-- Cycle 1 ends; the user left a note for next month during it.
select pg_temp.age_cycle(1, -1);
insert into public.next_cycle_inputs(period_id, user_id, note)
select id, user_id, 'More rice dishes please'
from public.monthly_plan_periods
where user_id='78787878-7878-4878-8878-787878787871' and cycle_index=1;

select extensions.throws_ok(
  $$select pg_temp.renew('renewal-key-cycle-2-free','b')$$,
  'P0001', 'subscription_inactive',
  'cycle 2 without a paid membership is rejected'
);

insert into public.entitlements(
  user_id, source, status, period_start, period_end, plan_generation_limit
) values (
  '78787878-7878-4878-8878-787878787871', 'gift', 'active',
  statement_timestamp() - interval '1 day', statement_timestamp() + interval '29 days', 1
);
select extensions.throws_ok(
  $$select pg_temp.renew('renewal-key-cycle-2-gift','b')$$,
  'P0001', 'subscription_inactive',
  'a gift entitlement does not unlock cycle 2'
);
select extensions.is(
  (select count(*) from public.monthly_plan_periods where user_id='78787878-7878-4878-8878-787878787871'),
  1::bigint,
  'rejected renewals create no period'
);
update public.entitlements set status='expired'
where user_id='78787878-7878-4878-8878-787878787871' and source='gift';

insert into public.entitlements(
  user_id, source, status, period_start, period_end, plan_generation_limit
) values (
  '78787878-7878-4878-8878-787878787871', 'subscription', 'active',
  statement_timestamp() - interval '1 hour', statement_timestamp() + interval '30 days', 1
);
update public.profiles set payment_method_status='not_collected'
where user_id='78787878-7878-4878-8878-787878787871';
select extensions.throws_ok(
  $$select pg_temp.renew('renewal-key-cycle-2-unpaid','b')$$,
  'P0001', 'payment_method_required',
  'an unpaid subscription period keeps the payment-method gate'
);
update public.profiles set payment_method_status='stub_recorded'
where user_id='78787878-7878-4878-8878-787878787871';

create temporary table renewal_result as
select pg_temp.renew('renewal-key-cycle-2','b') as payload;

select extensions.is(
  (select (payload ->> 'cycle_index')::integer from renewal_result), 2,
  'an expired plan plus a paid membership opens cycle 2'
);
select extensions.is(
  (select (payload ->> 'valid_from')::date from renewal_result), current_date,
  'a renewal after the end starts today'
);
select extensions.is(
  (select payload ->> 'previous_cycle_note' from renewal_result), 'More rice dishes please',
  'the cycle 1 note is returned when cycle 2 is built'
);
select extensions.ok(
  (select p.status = 'ready' and p.entitlement_id = (
      select id from public.entitlements
      where user_id = p.user_id and source = 'subscription')
   from public.monthly_plan_periods p
   where p.user_id='78787878-7878-4878-8878-787878787871' and p.cycle_index=2),
  'cycle 2 records a ready period tied to the paid membership'
);
select extensions.is(
  (select pl.status from public.monthly_plan_periods p
   join public.plan_versions v on v.id = p.imported_plan_version_id
   join public.plans pl on pl.id = v.plan_id
   where p.user_id='78787878-7878-4878-8878-787878787871' and p.cycle_index=1),
  'archived',
  'the ended cycle 1 plan is retired'
);
select extensions.is(
  (select count(*) from public.plans
   where user_id='78787878-7878-4878-8878-787878787871'
     and status='active' and current_date between valid_from and valid_to),
  1::bigint,
  'exactly one plan is active today'
);
select extensions.is(
  (select note from public.next_cycle_inputs n
   join public.monthly_plan_periods p on p.id = n.period_id
   where p.user_id='78787878-7878-4878-8878-787878787871' and p.cycle_index=1),
  'More rice dishes please',
  'the cycle 1 note is kept on its own period'
);

select extensions.is(
  pg_temp.renew('renewal-key-cycle-2-again','b') ->> 'plan_version_id',
  (select payload ->> 'plan_version_id' from renewal_result),
  'a new key during cycle 2 returns the cycle 2 plan, not the expired one'
);
select extensions.is(
  pg_temp.renew('renewal-key-cycle-2','b') - 'idempotent_replay',
  (select payload from renewal_result),
  'the same key replays the stored cycle 2 response'
);
select extensions.throws_ok(
  $$select pg_temp.renew('renewal-key-cycle-2','c')$$,
  'P0001', 'idempotency_key_reused',
  'the same key with another plan body is rejected'
);
select extensions.is(
  (select count(*) from public.monthly_plan_periods where user_id='78787878-7878-4878-8878-787878787871'),
  2::bigint,
  'repeats during cycle 2 create no period'
);

-- Four days left is too early; with two days left the next plan starts the
-- day after the current one ends.
select pg_temp.age_cycle(2, 3);
select extensions.is(
  (pg_temp.renew('renewal-key-cycle-3-early','d') ->> 'cycle_index')::integer,
  2,
  'more than three days left keeps returning the cycle 2 plan'
);
select pg_temp.age_cycle(2, 1);

create temporary table early_result as
select pg_temp.renew('renewal-key-cycle-3','d') as payload;
select extensions.ok(
  (select (payload ->> 'cycle_index')::integer = 3
     and (payload ->> 'valid_from')::date = current_date + 2
     and (payload ->> 'valid_to')::date = current_date + 31
   from early_result),
  'a renewal in the last three days becomes cycle 3, starting after cycle 2 ends'
);
select extensions.ok(
  (select pl.status = 'active' from public.monthly_plan_periods p
   join public.plan_versions v on v.id = p.imported_plan_version_id
   join public.plans pl on pl.id = v.plan_id
   where p.user_id='78787878-7878-4878-8878-787878787871' and p.cycle_index=2),
  'the running cycle 2 plan stays active until it ends'
);
select extensions.ok(
  (select starts_at > statement_timestamp() and ready_at = starts_at
   from public.monthly_plan_periods
   where user_id='78787878-7878-4878-8878-787878787871' and cycle_index=3),
  'the upcoming period starts with its plan'
);
select extensions.is(
  pg_temp.renew('renewal-key-cycle-3-again','d') ->> 'plan_version_id',
  (select payload ->> 'plan_version_id' from early_result),
  'a repeat after the early renewal returns the cycle 3 plan'
);
select extensions.is(
  (select count(*) from public.starter_plan_activations
   where user_id='78787878-7878-4878-8878-787878787871'),
  3::bigint,
  'one activation is stored per cycle'
);

select * from extensions.finish();
rollback;
