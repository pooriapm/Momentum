begin;
set local role postgres;
set local search_path = extensions, public;
create extension if not exists pgtap with schema extensions;
select extensions.plan(11);

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

insert into auth.users(
  id,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,
  created_at,updated_at,is_sso_user,is_anonymous
) values
  ('77777777-7777-4777-8777-777777777771','starter@example.com',statement_timestamp(),'{}','{"locale":"en-US","country_code":"US"}',statement_timestamp(),statement_timestamp(),false,false),
  ('77777777-7777-4777-8777-777777777772','minor@example.com',statement_timestamp(),'{}','{"locale":"en-US","country_code":"US"}',statement_timestamp(),statement_timestamp(),false,false);

insert into public.onboarding_drafts(user_id,current_step,payload) values (
  '77777777-7777-4777-8777-777777777771','review',jsonb_build_object(
    'firstName','Starter user','birthDate','1990-05-10','sex','undisclosed',
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
  '77777777-7777-4777-8777-777777777771','starter-onboarding-key-1',
  'terms-v1','privacy-v1','health-v1'
)$$,'managed onboarding completes before deterministic plan creation');

update public.profiles set
  date_of_birth=current_date - interval '15 years', country_code='US', product_region='intl',
  onboarding_status='complete', automation_block_reason=null,
  plan_source_preference='momentum', locale='en-US', timezone='UTC',
  terms_accepted_at=statement_timestamp(), terms_version='terms-v1',
  privacy_accepted_at=statement_timestamp(), privacy_version='privacy-v1',
  health_data_consent_at=statement_timestamp(), health_consent_version='health-v1'
where user_id='77777777-7777-4777-8777-777777777772';

insert into public.goals(
  user_id,goal_type,start_weight_kg,target_weight_kg,journey_start_date,target_date,status
) values ('77777777-7777-4777-8777-777777777772','maintenance',60,60,current_date,current_date+84,'active');

do $$
declare
  v_plan_id uuid;
  v_version_id uuid;
begin
  insert into public.plans(user_id,goal_id,name,status,valid_from,valid_to,locale)
  values (
    '77777777-7777-4777-8777-777777777772',
    (select id from public.goals where user_id='77777777-7777-4777-8777-777777777772'),
    'Previous valid plan','draft',current_date,current_date+29,'en-US'
  ) returning id into v_plan_id;
  insert into public.plan_versions(
    plan_id,user_id,version,schema_version,source,content,content_sha256
  ) values (
    v_plan_id,'77777777-7777-4777-8777-777777777772',1,'1.0.0','admin',
    pg_temp.monthly_fixture('Previous'),repeat('c',64)
  ) returning id into v_version_id;
  update public.plans set active_version_id=v_version_id,status='active' where id=v_plan_id;
end;
$$;

select extensions.lives_ok($$select public.persist_deterministic_starter_plan(
  '77777777-7777-4777-8777-777777777771', 'starter-plan-key-1',
  (select id from public.goals where user_id='77777777-7777-4777-8777-777777777771'),
  'Starter', current_date, current_date+29, 'en-US', '1.0.0', 'momentum-core@v2',
  'momentum-starter/1.0.0', 'terms-v1', 'privacy-v1', 'health-v1',
  pg_temp.monthly_fixture('Starter'), repeat('a',64)
)$$,'eligible managed onboarding can activate a deterministic starter plan');

select extensions.is(
  (select count(*) from public.starter_plan_activations where user_id='77777777-7777-4777-8777-777777777771'),
  1::bigint,
  'one activation metadata row is stored'
);
select extensions.is(
  (select source from public.plan_versions where user_id='77777777-7777-4777-8777-777777777771'),
  'deterministic',
  'immutable version records deterministic provenance'
);
select extensions.ok(
  (select p.active_version_id = a.plan_version_id and p.status='active'
   from public.plans p join public.starter_plan_activations a on a.plan_id=p.id
   where p.user_id='77777777-7777-4777-8777-777777777771'),
  'the validated version is activated atomically'
);

select extensions.lives_ok($$select public.persist_deterministic_starter_plan(
  '77777777-7777-4777-8777-777777777771', 'starter-plan-key-1',
  (select id from public.goals where user_id='77777777-7777-4777-8777-777777777771'),
  'Starter', current_date, current_date+29, 'en-US', '1.0.0', 'momentum-core@v2',
  'momentum-starter/1.0.0', 'terms-v1', 'privacy-v1', 'health-v1',
  pg_temp.monthly_fixture('Starter'), repeat('a',64)
)$$,'same request replays idempotently');
select extensions.is(
  (select count(*) from public.plans where user_id='77777777-7777-4777-8777-777777777771'),
  1::bigint,
  'idempotent replay does not create another plan'
);

select extensions.throws_ok($$select public.persist_deterministic_starter_plan(
  '77777777-7777-4777-8777-777777777772', 'starter-minor-key-1',
  (select id from public.goals where user_id='77777777-7777-4777-8777-777777777772'),
  'Minor starter', current_date, current_date+29, 'en-US', '1.0.0', 'momentum-core@v2',
  'momentum-starter/1.0.0', 'terms-v1', 'privacy-v1', 'health-v1',
  pg_temp.monthly_fixture('Minor'), repeat('b',64)
)$$,'P0001',null,'database gate rejects a minor even if the Edge layer is bypassed');
select extensions.is(
  (select count(*) from public.plans where user_id='77777777-7777-4777-8777-777777777772' and status='active'),
  1::bigint,
  'failed replacement preserves the previous valid plan'
);

select extensions.ok(
  not has_function_privilege(
    'authenticated',
    'public.persist_deterministic_starter_plan(uuid,text,uuid,text,date,date,text,text,text,text,text,text,text,jsonb,text)',
    'execute'
  ),
  'browser sessions cannot call the persistence RPC directly'
);
select extensions.ok(
  not has_table_privilege('service_role','public.plan_versions','update'),
  'service role cannot mutate stored plan versions after activation'
);

select * from extensions.finish();
rollback;
