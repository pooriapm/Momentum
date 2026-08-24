begin;

alter table public.workout_sessions
  drop constraint workout_sessions_status_check,
  drop constraint workout_session_end_consistency;

alter table public.workout_sessions
  add constraint workout_sessions_status_check
    check (status in ('in_progress', 'paused', 'completed', 'stopped')),
  add constraint workout_session_end_consistency check (
    (status in ('in_progress', 'paused') and ended_at is null) or
    (status in ('completed', 'stopped') and ended_at is not null)
  );

alter table public.workout_exercise_logs
  add column exercise_id text references public.exercise_catalog(id) on delete restrict,
  add column planned_substitute_exercise_id text references public.exercise_catalog(id) on delete restrict,
  add column substitute_exercise_id text references public.exercise_catalog(id) on delete restrict;

create or replace function public.start_workout_session(p_local_date date, p_workout_key text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
  v_timezone text;
  v_today date;
  v_plan public.plans%rowtype;
  v_version public.plan_versions%rowtype;
  v_day jsonb;
  v_workout jsonb;
  v_session public.workout_sessions%rowtype;
  v_exercise jsonb;
  v_exercise_log_id uuid;
  v_position integer;
  v_sets integer;
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  if p_workout_key is null or p_workout_key !~ '^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,119}$' then
    raise exception 'invalid_workout_key';
  end if;
  select timezone into v_timezone from public.profiles where user_id = v_user_id;
  begin v_today := (statement_timestamp() at time zone v_timezone)::date;
  exception when others then raise exception 'invalid_profile_timezone'; end;
  if p_local_date <> v_today then raise exception 'workout_date_not_current'; end if;

  select * into v_plan from public.plans
  where user_id = v_user_id and status = 'active' and p_local_date between valid_from and valid_to
  order by created_at desc limit 1;
  if not found or p_workout_key <> v_plan.id::text || '-' || (p_local_date - v_plan.valid_from)::text then
    raise exception 'active_workout_not_found';
  end if;
  select * into v_version from public.plan_versions
  where id = v_plan.active_version_id and user_id = v_user_id;
  select item into v_day
  from jsonb_array_elements(v_version.content->'days') as day(item)
  where (item->>'day_index')::integer = p_local_date - v_plan.valid_from
  limit 1;
  v_workout := v_day->'workout';
  if v_workout is null or jsonb_typeof(v_workout) <> 'object'
    or jsonb_typeof(v_workout->'exercises') <> 'array'
    or jsonb_array_length(v_workout->'exercises') = 0
  then raise exception 'active_workout_not_found'; end if;

  insert into public.workout_sessions(user_id, local_date, plan_version_id, workout_key, workout_title)
  values (v_user_id, p_local_date, v_version.id, p_workout_key, left(v_workout->>'title', 160))
  on conflict (user_id, local_date, workout_key) do nothing;
  select * into v_session from public.workout_sessions
  where user_id = v_user_id and local_date = p_local_date and workout_key = p_workout_key;

  if not exists (select 1 from public.workout_exercise_logs where session_id = v_session.id) then
    for v_exercise, v_position in
      select value, (ordinality - 1)::integer from jsonb_array_elements(v_workout->'exercises') with ordinality
    loop
      if not exists (
        select 1 from public.exercise_catalog
        where id = v_exercise->>'exercise_id' and active
      ) then raise exception 'invalid_catalog_exercise'; end if;
      if v_exercise->>'substitution_exercise_id' is not null and not exists (
        select 1 from public.exercise_substitutions relation
        join public.exercise_catalog substitute on substitute.id = relation.substitute_exercise_id and substitute.active
        where relation.exercise_id = v_exercise->>'exercise_id'
          and relation.substitute_exercise_id = v_exercise->>'substitution_exercise_id'
      ) then raise exception 'invalid_catalog_substitution'; end if;

      v_sets := greatest(1, least(20, (v_exercise->>'sets')::integer));
      insert into public.workout_exercise_logs(
        user_id, session_id, exercise_key, exercise_id, position, planned_name,
        planned_sets, planned_reps, planned_rest_seconds, planned_substitute_exercise_id
      ) values (
        v_user_id, v_session.id, left(v_exercise->>'exercise_key', 120), v_exercise->>'exercise_id',
        v_position, left(v_exercise->>'name', 160), v_sets, left(v_exercise->>'reps', 40),
        greatest(0, least(3600, (v_exercise->>'rest_seconds')::integer)),
        nullif(v_exercise->>'substitution_exercise_id', '')
      ) returning id into v_exercise_log_id;
      insert into public.workout_set_logs(user_id, exercise_log_id, set_number)
      select v_user_id, v_exercise_log_id, generate_series(1, v_sets);
    end loop;
  end if;
  return private.workout_session_snapshot(v_session.id, v_user_id);
end;
$$;

revoke all on function public.mutate_workout_session(uuid, text, text, integer, jsonb)
from public, anon, authenticated;
drop function public.mutate_workout_session(uuid, text, text, integer, jsonb);

create function public.mutate_workout_session(
  p_session_id uuid,
  p_action text,
  p_exercise_key text default null,
  p_set_number integer default null,
  p_values jsonb default '{}'::jsonb,
  p_idempotency_key text default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
  v_session public.workout_sessions%rowtype;
  v_exercise public.workout_exercise_logs%rowtype;
  v_existing private.account_mutation_keys%rowtype;
  v_complete boolean;
  v_severity integer;
  v_request_sha256 text;
  v_response jsonb;
  v_substitute_name text;
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  if char_length(coalesce(p_idempotency_key, '')) not between 8 and 128 then
    raise exception 'invalid_idempotency_key' using errcode = '22023';
  end if;
  if jsonb_typeof(coalesce(p_values, '{}'::jsonb)) <> 'object' then
    raise exception 'invalid_workout_values' using errcode = '22023';
  end if;

  v_request_sha256 := encode(extensions.digest(convert_to(jsonb_build_object(
    'session_id', p_session_id,
    'action', p_action,
    'exercise_key', p_exercise_key,
    'set_number', p_set_number,
    'values', coalesce(p_values, '{}'::jsonb)
  )::text, 'UTF8'), 'sha256'), 'hex');

  select * into v_existing from private.account_mutation_keys
  where user_id = v_user_id
    and action = 'workout-session-mutation'
    and idempotency_key = p_idempotency_key;
  if v_existing.user_id is not null then
    if v_existing.request_sha256 <> v_request_sha256 then
      raise exception 'idempotency_key_reused' using errcode = 'P0001';
    end if;
    return v_existing.response_payload;
  end if;

  select * into v_session from public.workout_sessions
  where id = p_session_id and user_id = v_user_id for update;
  if not found then raise exception 'workout_session_not_found'; end if;

  if p_action = 'resume' then
    if v_session.status <> 'paused' then raise exception 'workout_session_not_paused'; end if;
  elsif p_action = 'stop' then
    if v_session.status not in ('in_progress', 'paused') then raise exception 'workout_session_closed'; end if;
  elsif v_session.status <> 'in_progress' then
    raise exception 'workout_session_closed';
  end if;

  if p_exercise_key is not null then
    select * into v_exercise from public.workout_exercise_logs
    where session_id = p_session_id and user_id = v_user_id and exercise_key = p_exercise_key for update;
    if not found then raise exception 'workout_exercise_not_found'; end if;
  end if;
  if p_action in ('update_set', 'complete_exercise', 'skip_exercise', 'substitute_exercise', 'exercise_notes')
    and v_exercise.id is null
  then raise exception 'workout_exercise_not_found'; end if;

  case p_action
    when 'update_set' then
      if p_set_number is null or p_set_number not between 1 and v_exercise.planned_sets then
        raise exception 'invalid_set_number';
      end if;
      v_complete := coalesce((p_values->>'completed')::boolean, false);
      update public.workout_set_logs set
        status = case when v_complete then 'completed' else 'planned' end,
        weight_kg = nullif(p_values->>'weight_kg', '')::numeric,
        reps = nullif(p_values->>'reps', '')::integer,
        rpe = nullif(p_values->>'rpe', '')::numeric,
        rest_seconds = nullif(p_values->>'rest_seconds', '')::integer,
        completed_at = case when v_complete then statement_timestamp() else null end
      where exercise_log_id = v_exercise.id and set_number = p_set_number;
      update public.workout_exercise_logs set status = case
        when not v_complete and status = 'completed' then 'in_progress'
        when v_complete and status = 'planned' then 'in_progress'
        else status end
      where id = v_exercise.id;
    when 'complete_exercise' then
      if not exists (select 1 from public.workout_set_logs where exercise_log_id = v_exercise.id and status = 'completed') then
        raise exception 'exercise_has_no_completed_sets';
      end if;
      update public.workout_exercise_logs set status = 'completed' where id = v_exercise.id;
    when 'skip_exercise' then
      if char_length(trim(coalesce(p_values->>'reason', ''))) not between 1 and 500 then
        raise exception 'skip_reason_required';
      end if;
      update public.workout_exercise_logs set status = 'skipped', skip_reason = trim(p_values->>'reason') where id = v_exercise.id;
      update public.workout_set_logs set status = 'skipped', completed_at = null
      where exercise_log_id = v_exercise.id and status = 'planned';
    when 'substitute_exercise' then
      if p_values->>'exercise_id' is null
        or p_values->>'exercise_id' <> v_exercise.planned_substitute_exercise_id
        or not exists (
          select 1 from public.exercise_substitutions relation
          join public.exercise_catalog substitute on substitute.id = relation.substitute_exercise_id and substitute.active
          where relation.exercise_id = v_exercise.exercise_id
            and relation.substitute_exercise_id = p_values->>'exercise_id'
        )
      then raise exception 'invalid_catalog_substitution'; end if;
      select case when profile.locale = 'fa-IR' then catalog.name_fa else catalog.name_en end
      into v_substitute_name
      from public.exercise_catalog catalog
      join public.profiles profile on profile.user_id = v_user_id
      where catalog.id = p_values->>'exercise_id';
      update public.workout_exercise_logs set
        substitute_exercise_id = p_values->>'exercise_id',
        substitute_name = v_substitute_name,
        status = 'in_progress'
      where id = v_exercise.id;
    when 'exercise_notes' then
      if char_length(coalesce(p_values->>'notes', '')) > 1000 then raise exception 'notes_too_long'; end if;
      update public.workout_exercise_logs set notes = nullif(trim(p_values->>'notes'), '') where id = v_exercise.id;
    when 'session_notes' then
      if char_length(coalesce(p_values->>'notes', '')) > 2000 then raise exception 'notes_too_long'; end if;
      update public.workout_sessions set notes = nullif(trim(p_values->>'notes'), '') where id = p_session_id;
    when 'report_pain' then
      v_severity := (p_values->>'severity')::integer;
      if v_severity is null or v_severity not between 1 and 5
        or char_length(trim(coalesce(p_values->>'area', ''))) not between 1 and 160
      then raise exception 'invalid_pain_report'; end if;
      update public.workout_sessions set
        pain_reported = true,
        pain_area = trim(p_values->>'area'),
        pain_severity = v_severity,
        status = case when v_severity >= 4 then 'stopped' else status end,
        ended_at = case when v_severity >= 4 then statement_timestamp() else ended_at end,
        stop_reason = case when v_severity >= 4 then 'pain_reported' else stop_reason end
      where id = p_session_id;
    when 'pause' then
      update public.workout_sessions set status = 'paused' where id = p_session_id;
    when 'resume' then
      update public.workout_sessions set status = 'in_progress' where id = p_session_id;
    when 'stop' then
      if char_length(trim(coalesce(p_values->>'reason', ''))) not between 1 and 1000 then
        raise exception 'stop_reason_required';
      end if;
      update public.workout_sessions set status = 'stopped', ended_at = statement_timestamp(), stop_reason = trim(p_values->>'reason')
      where id = p_session_id;
    when 'finish' then
      if exists (select 1 from public.workout_exercise_logs where session_id = p_session_id and status not in ('completed', 'skipped')) then
        raise exception 'unfinished_exercises';
      end if;
      update public.workout_sessions set status = 'completed', ended_at = statement_timestamp() where id = p_session_id;
    else raise exception 'unsupported_workout_action';
  end case;

  v_response := private.workout_session_snapshot(p_session_id, v_user_id);
  insert into private.account_mutation_keys(user_id, action, idempotency_key, request_sha256, response_payload)
  values (v_user_id, 'workout-session-mutation', p_idempotency_key, v_request_sha256, v_response);
  return v_response;
exception
  when unique_violation then
    select * into v_existing from private.account_mutation_keys
    where user_id = v_user_id
      and action = 'workout-session-mutation'
      and idempotency_key = p_idempotency_key;
    if v_existing.request_sha256 = v_request_sha256 then return v_existing.response_payload; end if;
    raise exception 'idempotency_key_reused' using errcode = 'P0001';
  when check_violation or numeric_value_out_of_range or invalid_text_representation then
    raise exception 'invalid_workout_values';
end;
$$;

revoke all on function public.start_workout_session(date, text) from public, anon;
revoke all on function public.mutate_workout_session(uuid, text, text, integer, jsonb, text)
from public, anon;
grant execute on function public.start_workout_session(date, text) to authenticated;
grant execute on function public.mutate_workout_session(uuid, text, text, integer, jsonb, text)
to authenticated;

commit;
