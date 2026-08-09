-- Server-authoritative self-service settings. Eligibility, pricing, billing
-- country and automation review fields are deliberately absent from the RPC.

alter table public.profiles drop constraint profiles_unit_system_check;
alter table public.profiles add constraint profiles_unit_system_check
check (unit_system in ('metric', 'imperial'));

alter table public.profiles
  add column health_data_consent_withdrawn_at timestamptz;

alter table public.plans
  add column review_required_at timestamptz,
  add column review_required_reason text
    check (review_required_reason is null or char_length(review_required_reason) <= 120),
  add constraint plans_review_required_complete check (
    (review_required_at is null) = (review_required_reason is null)
  );

-- Remove legacy browser-write paths for every table owned by this settings
-- workflow. Reads remain owner-scoped through the existing RLS policies.
revoke update (display_name, date_of_birth, sex, height_cm, locale, timezone, unit_system)
on public.profiles from authenticated;
revoke insert, update, delete on public.goals from authenticated;
revoke insert, update, delete on public.dietary_preferences from authenticated;
revoke insert, update, delete on public.training_schedule_items from authenticated;

create or replace function public.update_account_settings(
  p_user_id uuid,
  p_payload jsonb,
  p_idempotency_key text,
  p_request_sha256 text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_existing private.account_mutation_keys%rowtype;
  v_profile public.profiles%rowtype;
  v_goal public.goals%rowtype;
  v_diet public.dietary_preferences%rowtype;
  v_old_schedule jsonb;
  v_new_schedule jsonb;
  v_changed_sections text[] := '{}';
  v_plan_review_required boolean := false;
  v_response jsonb;
begin
  if p_user_id is null
    or jsonb_typeof(p_payload) <> 'object'
    or char_length(p_idempotency_key) not between 8 and 128
    or p_request_sha256 !~ '^[a-f0-9]{64}$'
  then
    raise exception 'invalid_account_settings_arguments' using errcode = '22023';
  end if;

  select * into v_existing from private.account_mutation_keys
  where user_id = p_user_id and action = 'update-account-settings'
    and idempotency_key = p_idempotency_key;
  if v_existing.user_id is not null then
    if v_existing.request_sha256 <> p_request_sha256 then
      raise exception 'idempotency_key_reused' using errcode = 'P0001';
    end if;
    return v_existing.response_payload;
  end if;

  select * into v_profile from public.profiles where user_id = p_user_id for update;
  select * into v_goal from public.goals where user_id = p_user_id and status = 'active' for update;
  select * into v_diet from public.dietary_preferences where user_id = p_user_id for update;
  if v_profile.user_id is null or v_goal.id is null then
    raise exception 'account_settings_not_ready' using errcode = 'P0002';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'weekday', weekday,
    'activity_type', activity_type,
    'local_start_time', to_char(local_start_time, 'HH24:MI'),
    'duration_minutes', duration_minutes
  ) order by weekday), '[]'::jsonb)
  into v_old_schedule
  from public.training_schedule_items where user_id = p_user_id;
  select coalesce(jsonb_agg(item order by (item ->> 'weekday')::integer), '[]'::jsonb)
  into v_new_schedule
  from jsonb_array_elements(coalesce(p_payload -> 'schedule', '[]'::jsonb)) item;

  if (v_profile.display_name, v_profile.sex, v_profile.height_cm, v_profile.locale, v_profile.unit_system)
    is distinct from (
      p_payload ->> 'display_name',
      p_payload ->> 'sex',
      (p_payload ->> 'height_cm')::numeric,
      p_payload ->> 'locale',
      p_payload ->> 'unit_system'
    )
  then v_changed_sections := array_append(v_changed_sections, 'profile'); end if;

  if (v_goal.goal_type, v_goal.custom_goal, v_goal.target_weight_kg)
    is distinct from (
      p_payload ->> 'goal_type',
      nullif(p_payload ->> 'custom_goal', ''),
      (p_payload ->> 'target_weight_kg')::numeric
    )
  then v_changed_sections := array_append(v_changed_sections, 'goal'); end if;

  if v_diet.user_id is null or (
    v_diet.dietary_pattern,
    v_diet.favorite_foods,
    v_diet.allergies,
    v_diet.available_equipment,
    v_diet.work_schedule,
    v_diet.cuisine_region
  ) is distinct from (
    p_payload ->> 'dietary_pattern',
    array(select jsonb_array_elements_text(p_payload -> 'favorite_foods')),
    array(select jsonb_array_elements_text(p_payload -> 'allergies')),
    array(select jsonb_array_elements_text(p_payload -> 'available_equipment')),
    nullif(p_payload ->> 'work_schedule', ''),
    p_payload ->> 'cuisine_region'
  )
  then v_changed_sections := array_append(v_changed_sections, 'dietary'); end if;

  if v_old_schedule is distinct from v_new_schedule then
    v_changed_sections := array_append(v_changed_sections, 'schedule');
  end if;

  -- Name and display-unit changes do not invalidate plan content. All other
  -- editable physiological, goal, food, locale and schedule changes do.
  v_plan_review_required :=
    v_profile.sex is distinct from (p_payload ->> 'sex')
    or v_profile.height_cm is distinct from (p_payload ->> 'height_cm')::numeric
    or v_profile.locale is distinct from (p_payload ->> 'locale')
    or 'goal' = any(v_changed_sections)
    or 'dietary' = any(v_changed_sections)
    or 'schedule' = any(v_changed_sections);

  update public.profiles set
    display_name = p_payload ->> 'display_name',
    sex = p_payload ->> 'sex',
    height_cm = (p_payload ->> 'height_cm')::numeric,
    locale = p_payload ->> 'locale',
    unit_system = p_payload ->> 'unit_system'
  where user_id = p_user_id;

  update public.goals set
    goal_type = p_payload ->> 'goal_type',
    custom_goal = nullif(p_payload ->> 'custom_goal', ''),
    target_weight_kg = (p_payload ->> 'target_weight_kg')::numeric
  where id = v_goal.id and user_id = p_user_id;

  insert into public.dietary_preferences(
    user_id, dietary_pattern, favorite_foods, allergies, available_equipment,
    work_schedule, cuisine_region
  ) values (
    p_user_id,
    p_payload ->> 'dietary_pattern',
    array(select jsonb_array_elements_text(p_payload -> 'favorite_foods')),
    array(select jsonb_array_elements_text(p_payload -> 'allergies')),
    array(select jsonb_array_elements_text(p_payload -> 'available_equipment')),
    nullif(p_payload ->> 'work_schedule', ''),
    p_payload ->> 'cuisine_region'
  ) on conflict (user_id) do update set
    dietary_pattern = excluded.dietary_pattern,
    favorite_foods = excluded.favorite_foods,
    allergies = excluded.allergies,
    available_equipment = excluded.available_equipment,
    work_schedule = excluded.work_schedule,
    cuisine_region = excluded.cuisine_region,
    updated_at = statement_timestamp();

  delete from public.training_schedule_items where user_id = p_user_id;
  insert into public.training_schedule_items(
    user_id, weekday, activity_type, local_start_time, duration_minutes, intensity
  )
  select
    p_user_id,
    (item ->> 'weekday')::smallint,
    item ->> 'activity_type',
    (item ->> 'local_start_time')::time,
    (item ->> 'duration_minutes')::smallint,
    'moderate'
  from jsonb_array_elements(p_payload -> 'schedule') item;

  if v_plan_review_required then
    update public.plans set
      review_required_at = statement_timestamp(),
      review_required_reason = 'account_settings_changed'
    where user_id = p_user_id and status = 'active';
  end if;

  v_response := jsonb_build_object(
    'updated', true,
    'plan_review_required', v_plan_review_required,
    'changed_sections', v_changed_sections
  );
  insert into private.account_audit_events(user_id, event_type, actor_type, metadata)
  values (p_user_id, 'account.settings_updated', 'service', jsonb_build_object(
    'changed_sections', v_changed_sections,
    'plan_review_required', v_plan_review_required
  ));
  insert into private.account_mutation_keys(user_id, action, idempotency_key, request_sha256, response_payload)
  values (p_user_id, 'update-account-settings', p_idempotency_key, p_request_sha256, v_response);
  return v_response;
exception
  when unique_violation then
    select * into v_existing from private.account_mutation_keys
    where user_id = p_user_id and action = 'update-account-settings'
      and idempotency_key = p_idempotency_key;
    if v_existing.request_sha256 = p_request_sha256 then return v_existing.response_payload; end if;
    raise exception 'idempotency_key_reused' using errcode = 'P0001';
end;
$$;

revoke all on function public.update_account_settings(uuid, jsonb, text, text)
from public, anon, authenticated;
grant execute on function public.update_account_settings(uuid, jsonb, text, text) to service_role;

create or replace function public.withdraw_health_data_consent(
  p_user_id uuid,
  p_idempotency_key text,
  p_request_sha256 text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_existing private.account_mutation_keys%rowtype;
  v_response jsonb := '{"withdrawn":true,"plan_review_required":true}'::jsonb;
  v_had_consent boolean;
begin
  if p_user_id is null
    or char_length(p_idempotency_key) not between 8 and 128
    or p_request_sha256 !~ '^[a-f0-9]{64}$'
  then raise exception 'invalid_consent_withdrawal_arguments' using errcode = '22023'; end if;

  select * into v_existing from private.account_mutation_keys
  where user_id = p_user_id and action = 'withdraw-health-data-consent'
    and idempotency_key = p_idempotency_key;
  if v_existing.user_id is not null then
    if v_existing.request_sha256 <> p_request_sha256 then raise exception 'idempotency_key_reused' using errcode = 'P0001'; end if;
    return v_existing.response_payload;
  end if;

  select health_data_consent_at is not null into v_had_consent
  from public.profiles where user_id = p_user_id for update;
  if v_had_consent is null then raise exception 'profile_not_found' using errcode = 'P0002'; end if;

  update public.profiles set
    health_data_consent_at = null,
    health_consent_version = null,
    health_data_consent_withdrawn_at = coalesce(health_data_consent_withdrawn_at, statement_timestamp()),
    onboarding_status = 'automation_blocked',
    automation_block_reason = 'health_consent_withdrawn'
  where user_id = p_user_id;

  update public.plans set
    review_required_at = coalesce(review_required_at, statement_timestamp()),
    review_required_reason = 'health_consent_withdrawn'
  where user_id = p_user_id and status = 'active';

  if v_had_consent then
    insert into private.account_audit_events(user_id, event_type, actor_type, metadata)
    values (p_user_id, 'consent.health_withdrawn', 'service', '{"automation_blocked":true}'::jsonb);
  end if;
  insert into private.account_mutation_keys(user_id, action, idempotency_key, request_sha256, response_payload)
  values (p_user_id, 'withdraw-health-data-consent', p_idempotency_key, p_request_sha256, v_response);
  return v_response;
exception
  when unique_violation then
    select * into v_existing from private.account_mutation_keys
    where user_id = p_user_id and action = 'withdraw-health-data-consent'
      and idempotency_key = p_idempotency_key;
    if v_existing.request_sha256 = p_request_sha256 then return v_existing.response_payload; end if;
    raise exception 'idempotency_key_reused' using errcode = 'P0001';
end;
$$;

revoke all on function public.withdraw_health_data_consent(uuid, text, text)
from public, anon, authenticated;
grant execute on function public.withdraw_health_data_consent(uuid, text, text) to service_role;
