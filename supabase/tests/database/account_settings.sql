begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(9);

insert into auth.users(id,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,is_sso_user,is_anonymous)
values ('66666666-6666-4666-8666-666666666666','settings@example.com',statement_timestamp(),'{}','{"locale":"en-US","country_code":"US"}',statement_timestamp(),statement_timestamp(),false,false);
update public.profiles set locale='en-US', timezone='UTC', country_code='US', pricing_market='global', health_data_consent_at=statement_timestamp(), health_consent_version='health-v1' where user_id='66666666-6666-4666-8666-666666666666';
insert into public.goals(user_id,goal_type,start_weight_kg,target_weight_kg,journey_start_date,target_date,status) values ('66666666-6666-4666-8666-666666666666','maintenance',80,80,current_date,current_date+84,'active');
insert into public.dietary_preferences(user_id,dietary_pattern) values ('66666666-6666-4666-8666-666666666666','omnivore');
insert into public.plans(user_id,goal_id,name,status,valid_from,valid_to,locale) select user_id,id,'Settings test','active',current_date,current_date+6,'en-US' from public.goals where user_id='66666666-6666-4666-8666-666666666666';

select extensions.lives_ok($$select public.update_account_settings(
  '66666666-6666-4666-8666-666666666666',
  '{"display_name":"Updated","sex":"prefer_not_to_say","height_cm":175,"locale":"fa-IR","unit_system":"imperial","goal_type":"fat_loss","custom_goal":null,"target_weight_kg":72,"dietary_pattern":"vegetarian","favorite_foods":["rice"],"allergies":["peanut"],"available_equipment":["dumbbells"],"work_schedule":"weekdays","cuisine_region":"iran","schedule":[{"weekday":1,"activity_type":"strength","local_start_time":"18:30","duration_minutes":60}]}'::jsonb,
  'settings-update-key-1',repeat('d',64)
)$$,'approved account settings can be updated');
select extensions.is((select display_name from public.profiles where user_id='66666666-6666-4666-8666-666666666666'),'Updated','profile fields are updated');
select extensions.is((select country_code from public.profiles where user_id='66666666-6666-4666-8666-666666666666'),'US','country remains protected');
select extensions.is((select review_required_reason from public.plans where user_id='66666666-6666-4666-8666-666666666666'),'account_settings_changed','plan-affecting changes require review');
select extensions.is((select count(*) from private.account_audit_events where user_id='66666666-6666-4666-8666-666666666666' and event_type='account.settings_updated'),1::bigint,'settings update is audited');
select extensions.ok(not has_function_privilege('authenticated','public.update_account_settings(uuid,jsonb,text,text)','execute'),'browser cannot call settings RPC directly');
select extensions.lives_ok($$select public.withdraw_health_data_consent('66666666-6666-4666-8666-666666666666','withdraw-key-1',repeat('e',64))$$,'health consent can be withdrawn');
select extensions.is((select onboarding_status from public.profiles where user_id='66666666-6666-4666-8666-666666666666'),'automation_blocked','withdrawal stops automation');
select extensions.is((select health_data_consent_at from public.profiles where user_id='66666666-6666-4666-8666-666666666666'),null::timestamptz,'active health consent is cleared');

select * from extensions.finish();
rollback;
