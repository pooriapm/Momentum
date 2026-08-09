-- Safety-complete daily and weekly check-ins. Mutations are service-only so the
-- deterministic safety classification and private audit event cannot be bypassed.

alter table public.daily_checkins
  add column pain_score smallint not null default 0
    check (pain_score between 0 and 10),
  add column pain_location text
    check (pain_location is null or char_length(pain_location) <= 240),
  add column training_difficulty_score smallint
    check (training_difficulty_score is null or training_difficulty_score between 1 and 5),
  add column recovery_score smallint
    check (recovery_score is null or recovery_score between 1 and 5),
  add column red_flags text[] not null default '{}'
    check (
      cardinality(red_flags) <= 4
      and red_flags <@ array[
        'chest_pain',
        'fainting',
        'severe_shortness_of_breath',
        'sudden_weakness_or_numbness'
      ]::text[]
    ),
  add column safety_level text not null default 'normal'
    check (safety_level in ('normal', 'caution', 'urgent')),
  add column safety_reasons text[] not null default '{}'
    check (cardinality(safety_reasons) <= 8);

create table public.weekly_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  week_start date not null check (extract(isodow from week_start) = 1),
  timezone text not null check (char_length(timezone) between 1 and 80),
  overall_score smallint not null check (overall_score between 1 and 5),
  recovery_trend text not null check (recovery_trend in ('improved', 'stable', 'worse')),
  training_trend text not null check (training_trend in ('easier', 'same', 'harder', 'not_applicable')),
  pain_trend text not null check (pain_trend in ('improved', 'stable', 'worse', 'no_pain')),
  circumstances_changed boolean not null default false,
  condition_change text not null default 'none'
    check (condition_change in ('none', 'new_condition', 'medication_change', 'injury_or_worsening_pain', 'other')),
  change_notes text check (change_notes is null or char_length(change_notes) <= 2000),
  notes text check (notes is null or char_length(notes) <= 2000),
  red_flags text[] not null default '{}'
    check (
      cardinality(red_flags) <= 4
      and red_flags <@ array[
        'chest_pain',
        'fainting',
        'severe_shortness_of_breath',
        'sudden_weakness_or_numbness'
      ]::text[]
    ),
  safety_level text not null default 'normal'
    check (safety_level in ('normal', 'caution', 'urgent')),
  safety_reasons text[] not null default '{}'
    check (cardinality(safety_reasons) <= 8),
  trend_summary jsonb not null default '{}'::jsonb
    check (jsonb_typeof(trend_summary) = 'object'),
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint weekly_checkins_user_week_unique unique (user_id, week_start),
  constraint weekly_checkins_change_context check (
    (not circumstances_changed and condition_change = 'none')
    or (change_notes is not null and char_length(btrim(change_notes)) > 0)
  )
);

create index weekly_checkins_user_week_idx
on public.weekly_checkins(user_id, week_start desc);

create trigger weekly_checkins_set_updated_at
before update on public.weekly_checkins
for each row execute function public.set_updated_at();

alter table public.weekly_checkins enable row level security;

revoke all on public.weekly_checkins from anon, authenticated;
grant select on public.weekly_checkins to authenticated;

create policy weekly_checkins_select_own
on public.weekly_checkins for select to authenticated
using ((select auth.uid()) = user_id);

-- Existing clients could write daily rows directly. Close that bypass; all new
-- daily and weekly mutations go through the audited service RPCs below.
revoke insert, update, delete on public.daily_checkins from authenticated;

create or replace function public.save_daily_checkin(
  p_user_id uuid,
  p_local_date date,
  p_timezone text,
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
  v_profile_timezone text;
  v_checkin public.daily_checkins%rowtype;
  v_red_flags text[];
  v_reasons text[] := '{}';
  v_safety_level text := 'normal';
  v_pain_score smallint;
  v_recovery_score smallint;
  v_training_score smallint;
  v_response jsonb;
begin
  if p_user_id is null
    or p_local_date is null
    or char_length(p_timezone) not between 1 and 80
    or jsonb_typeof(p_payload) <> 'object'
    or char_length(p_idempotency_key) not between 8 and 128
    or p_request_sha256 !~ '^[a-f0-9]{64}$'
  then
    raise exception 'invalid_daily_checkin_arguments' using errcode = '22023';
  end if;

  select * into v_existing
  from private.account_mutation_keys
  where user_id = p_user_id
    and action = 'save-daily-checkin'
    and idempotency_key = p_idempotency_key;
  if v_existing.user_id is not null then
    if v_existing.request_sha256 <> p_request_sha256 then
      raise exception 'idempotency_key_reused' using errcode = 'P0001';
    end if;
    return v_existing.response_payload;
  end if;

  select timezone into v_profile_timezone
  from public.profiles where user_id = p_user_id;
  if v_profile_timezone is null or v_profile_timezone <> p_timezone then
    raise exception 'profile_timezone_mismatch' using errcode = 'P0001';
  end if;
  if p_local_date <> private.current_profile_local_date(p_user_id) then
    raise exception 'checkin_date_not_current' using errcode = 'P0001';
  end if;

  if jsonb_typeof(coalesce(p_payload -> 'red_flags', '[]'::jsonb)) <> 'array' then
    raise exception 'invalid_daily_checkin_arguments' using errcode = '22023';
  end if;
  v_red_flags := array(
    select distinct flag
    from jsonb_array_elements_text(coalesce(p_payload -> 'red_flags', '[]'::jsonb)) as flags(flag)
  );
  v_pain_score := (p_payload ->> 'pain_score')::smallint;
  v_recovery_score := (p_payload ->> 'recovery_score')::smallint;
  v_training_score := (p_payload ->> 'training_difficulty_score')::smallint;

  if v_red_flags is null
    or cardinality(v_red_flags) > 4
    or not (v_red_flags <@ array[
      'chest_pain', 'fainting', 'severe_shortness_of_breath', 'sudden_weakness_or_numbness'
    ]::text[])
    or v_pain_score not between 0 and 10
    or v_recovery_score not between 1 and 5
    or (v_training_score is not null and v_training_score not between 1 and 5)
    or (p_payload ->> 'energy_score')::smallint not between 1 and 5
    or (p_payload ->> 'hunger_score')::smallint not between 1 and 5
    or (p_payload ->> 'mood_score')::smallint not between 1 and 5
    or (p_payload ->> 'sleep_minutes')::smallint not between 0 and 1440
    or (
      v_pain_score > 0
      and coalesce(char_length(btrim(p_payload ->> 'pain_location')), 0) = 0
    )
  then
    raise exception 'invalid_daily_checkin_arguments' using errcode = '22023';
  end if;

  if cardinality(v_red_flags) > 0 then
    v_reasons := array_append(v_reasons, 'emergency_symptom_reported');
    v_safety_level := 'urgent';
  end if;
  if v_pain_score >= 7 then
    v_reasons := array_append(v_reasons, 'severe_pain');
    v_safety_level := 'urgent';
  elsif v_pain_score >= 4 then
    v_reasons := array_append(v_reasons, 'moderate_pain');
    if v_safety_level = 'normal' then v_safety_level := 'caution'; end if;
  end if;
  if v_recovery_score <= 2 then
    v_reasons := array_append(v_reasons, 'low_recovery');
    if v_safety_level = 'normal' then v_safety_level := 'caution'; end if;
  end if;
  if v_training_score = 5 then
    v_reasons := array_append(v_reasons, 'max_training_difficulty');
    if v_safety_level = 'normal' then v_safety_level := 'caution'; end if;
  end if;

  insert into public.daily_checkins(
    user_id, local_date, timezone, weight_kg, sleep_minutes, hunger_score,
    mood_score, energy_score, adherence_percent, pain_score, pain_location,
    training_difficulty_score, recovery_score, notes, red_flags,
    safety_level, safety_reasons
  ) values (
    p_user_id,
    p_local_date,
    p_timezone,
    (p_payload ->> 'weight_kg')::numeric,
    (p_payload ->> 'sleep_minutes')::smallint,
    (p_payload ->> 'hunger_score')::smallint,
    (p_payload ->> 'mood_score')::smallint,
    (p_payload ->> 'energy_score')::smallint,
    (p_payload ->> 'adherence_percent')::numeric,
    v_pain_score,
    nullif(btrim(p_payload ->> 'pain_location'), ''),
    v_training_score,
    v_recovery_score,
    nullif(btrim(p_payload ->> 'notes'), ''),
    v_red_flags,
    v_safety_level,
    v_reasons
  )
  on conflict (user_id, local_date) do update set
    timezone = excluded.timezone,
    weight_kg = excluded.weight_kg,
    sleep_minutes = excluded.sleep_minutes,
    hunger_score = excluded.hunger_score,
    mood_score = excluded.mood_score,
    energy_score = excluded.energy_score,
    adherence_percent = excluded.adherence_percent,
    pain_score = excluded.pain_score,
    pain_location = excluded.pain_location,
    training_difficulty_score = excluded.training_difficulty_score,
    recovery_score = excluded.recovery_score,
    notes = excluded.notes,
    red_flags = excluded.red_flags,
    safety_level = excluded.safety_level,
    safety_reasons = excluded.safety_reasons,
    updated_at = statement_timestamp()
  returning * into v_checkin;

  v_response := jsonb_build_object(
    'checkin', jsonb_build_object(
      'id', v_checkin.id,
      'local_date', v_checkin.local_date,
      'updated_at', v_checkin.updated_at
    ),
    'safety', jsonb_build_object('level', v_safety_level, 'reasons', v_reasons)
  );

  insert into private.account_audit_events(user_id, event_type, actor_type, metadata)
  values (
    p_user_id,
    'checkin.daily_saved',
    'service',
    jsonb_build_object(
      'checkin_id', v_checkin.id,
      'local_date', p_local_date,
      'safety_level', v_safety_level,
      'safety_reasons', v_reasons
    )
  );

  insert into private.account_mutation_keys(
    user_id, action, idempotency_key, request_sha256, response_payload
  ) values (
    p_user_id, 'save-daily-checkin', p_idempotency_key, p_request_sha256, v_response
  );
  return v_response;
exception
  when unique_violation then
    select * into v_existing
    from private.account_mutation_keys
    where user_id = p_user_id
      and action = 'save-daily-checkin'
      and idempotency_key = p_idempotency_key;
    if v_existing.request_sha256 = p_request_sha256 then
      return v_existing.response_payload;
    end if;
    raise exception 'idempotency_key_reused' using errcode = 'P0001';
end;
$$;

revoke all on function public.save_daily_checkin(uuid, date, text, jsonb, text, text)
from public, anon, authenticated;
grant execute on function public.save_daily_checkin(uuid, date, text, jsonb, text, text)
to service_role;

create or replace function public.save_weekly_checkin(
  p_user_id uuid,
  p_week_start date,
  p_timezone text,
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
  v_profile_timezone text;
  v_current_week date;
  v_checkin public.weekly_checkins%rowtype;
  v_red_flags text[];
  v_reasons text[] := '{}';
  v_safety_level text := 'normal';
  v_current jsonb;
  v_previous jsonb;
  v_delta jsonb;
  v_current_count integer;
  v_previous_count integer;
  v_trend_summary jsonb;
  v_response jsonb;
begin
  if p_user_id is null
    or p_week_start is null
    or extract(isodow from p_week_start) <> 1
    or char_length(p_timezone) not between 1 and 80
    or jsonb_typeof(p_payload) <> 'object'
    or char_length(p_idempotency_key) not between 8 and 128
    or p_request_sha256 !~ '^[a-f0-9]{64}$'
  then
    raise exception 'invalid_weekly_checkin_arguments' using errcode = '22023';
  end if;

  select * into v_existing
  from private.account_mutation_keys
  where user_id = p_user_id
    and action = 'save-weekly-checkin'
    and idempotency_key = p_idempotency_key;
  if v_existing.user_id is not null then
    if v_existing.request_sha256 <> p_request_sha256 then
      raise exception 'idempotency_key_reused' using errcode = 'P0001';
    end if;
    return v_existing.response_payload;
  end if;

  select timezone into v_profile_timezone
  from public.profiles where user_id = p_user_id;
  if v_profile_timezone is null or v_profile_timezone <> p_timezone then
    raise exception 'profile_timezone_mismatch' using errcode = 'P0001';
  end if;
  v_current_week := date_trunc('week', private.current_profile_local_date(p_user_id))::date;
  if p_week_start <> v_current_week then
    raise exception 'checkin_week_not_current' using errcode = 'P0001';
  end if;

  if jsonb_typeof(coalesce(p_payload -> 'red_flags', '[]'::jsonb)) <> 'array' then
    raise exception 'invalid_weekly_checkin_arguments' using errcode = '22023';
  end if;
  v_red_flags := array(
    select distinct flag
    from jsonb_array_elements_text(coalesce(p_payload -> 'red_flags', '[]'::jsonb)) as flags(flag)
  );

  if v_red_flags is null
    or cardinality(v_red_flags) > 4
    or not (v_red_flags <@ array[
      'chest_pain', 'fainting', 'severe_shortness_of_breath', 'sudden_weakness_or_numbness'
    ]::text[])
    or (p_payload ->> 'overall_score')::smallint not between 1 and 5
    or (p_payload ->> 'recovery_trend') not in ('improved', 'stable', 'worse')
    or (p_payload ->> 'training_trend') not in ('easier', 'same', 'harder', 'not_applicable')
    or (p_payload ->> 'pain_trend') not in ('improved', 'stable', 'worse', 'no_pain')
    or (p_payload ->> 'condition_change') not in (
      'none', 'new_condition', 'medication_change', 'injury_or_worsening_pain', 'other'
    )
    or (
      ((p_payload ->> 'circumstances_changed')::boolean
        or (p_payload ->> 'condition_change') <> 'none')
      and coalesce(char_length(btrim(p_payload ->> 'change_notes')), 0) = 0
    )
  then
    raise exception 'invalid_weekly_checkin_arguments' using errcode = '22023';
  end if;

  if cardinality(v_red_flags) > 0 then
    v_reasons := array_append(v_reasons, 'emergency_symptom_reported');
    v_safety_level := 'urgent';
  end if;
  if (p_payload ->> 'condition_change') in ('new_condition', 'injury_or_worsening_pain') then
    v_reasons := array_append(v_reasons, 'health_condition_changed');
    if v_safety_level = 'normal' then v_safety_level := 'caution'; end if;
  end if;
  if (p_payload ->> 'pain_trend') = 'worse' then
    v_reasons := array_append(v_reasons, 'pain_worsening');
    if v_safety_level = 'normal' then v_safety_level := 'caution'; end if;
  end if;
  if (p_payload ->> 'recovery_trend') = 'worse' then
    v_reasons := array_append(v_reasons, 'recovery_worsening');
    if v_safety_level = 'normal' then v_safety_level := 'caution'; end if;
  end if;
  if (p_payload ->> 'training_trend') = 'harder' then
    v_reasons := array_append(v_reasons, 'training_feels_harder');
    if v_safety_level = 'normal' then v_safety_level := 'caution'; end if;
  end if;

  with stats as (
    select
      round(avg(adherence_percent) filter (
        where local_date between p_week_start and p_week_start + 6
      ), 2) as current_adherence,
      round(avg(pain_score) filter (
        where local_date between p_week_start and p_week_start + 6
      ), 2) as current_pain,
      round(avg(recovery_score) filter (
        where local_date between p_week_start and p_week_start + 6
      ), 2) as current_recovery,
      round(avg(training_difficulty_score) filter (
        where local_date between p_week_start and p_week_start + 6
      ), 2) as current_training,
      round(avg(adherence_percent) filter (
        where local_date between p_week_start - 7 and p_week_start - 1
      ), 2) as previous_adherence,
      round(avg(pain_score) filter (
        where local_date between p_week_start - 7 and p_week_start - 1
      ), 2) as previous_pain,
      round(avg(recovery_score) filter (
        where local_date between p_week_start - 7 and p_week_start - 1
      ), 2) as previous_recovery,
      round(avg(training_difficulty_score) filter (
        where local_date between p_week_start - 7 and p_week_start - 1
      ), 2) as previous_training,
      count(*) filter (where local_date between p_week_start and p_week_start + 6)::integer as current_count,
      count(*) filter (where local_date between p_week_start - 7 and p_week_start - 1)::integer as previous_count
    from public.daily_checkins
    where user_id = p_user_id
      and local_date between p_week_start - 7 and p_week_start + 6
  )
  select
    jsonb_build_object(
      'adherence_percent', current_adherence,
      'pain_score', current_pain,
      'recovery_score', current_recovery,
      'training_difficulty_score', current_training
    ),
    jsonb_build_object(
      'adherence_percent', previous_adherence,
      'pain_score', previous_pain,
      'recovery_score', previous_recovery,
      'training_difficulty_score', previous_training
    ),
    jsonb_build_object(
      'adherence_percent', case when current_adherence is not null and previous_adherence is not null then round(current_adherence - previous_adherence, 2) end,
      'pain_score', case when current_pain is not null and previous_pain is not null then round(current_pain - previous_pain, 2) end,
      'recovery_score', case when current_recovery is not null and previous_recovery is not null then round(current_recovery - previous_recovery, 2) end,
      'training_difficulty_score', case when current_training is not null and previous_training is not null then round(current_training - previous_training, 2) end
    ),
    current_count,
    previous_count
  into v_current, v_previous, v_delta, v_current_count, v_previous_count
  from stats;

  v_trend_summary := jsonb_build_object(
    'current', v_current,
    'previous', v_previous,
    'delta', v_delta,
    'current_daily_count', v_current_count,
    'previous_daily_count', v_previous_count
  );

  insert into public.weekly_checkins(
    user_id, week_start, timezone, overall_score, recovery_trend,
    training_trend, pain_trend, circumstances_changed, condition_change,
    change_notes, notes, red_flags, safety_level, safety_reasons, trend_summary
  ) values (
    p_user_id,
    p_week_start,
    p_timezone,
    (p_payload ->> 'overall_score')::smallint,
    p_payload ->> 'recovery_trend',
    p_payload ->> 'training_trend',
    p_payload ->> 'pain_trend',
    (p_payload ->> 'circumstances_changed')::boolean,
    p_payload ->> 'condition_change',
    nullif(btrim(p_payload ->> 'change_notes'), ''),
    nullif(btrim(p_payload ->> 'notes'), ''),
    v_red_flags,
    v_safety_level,
    v_reasons,
    v_trend_summary
  )
  on conflict (user_id, week_start) do update set
    timezone = excluded.timezone,
    overall_score = excluded.overall_score,
    recovery_trend = excluded.recovery_trend,
    training_trend = excluded.training_trend,
    pain_trend = excluded.pain_trend,
    circumstances_changed = excluded.circumstances_changed,
    condition_change = excluded.condition_change,
    change_notes = excluded.change_notes,
    notes = excluded.notes,
    red_flags = excluded.red_flags,
    safety_level = excluded.safety_level,
    safety_reasons = excluded.safety_reasons,
    trend_summary = excluded.trend_summary,
    updated_at = statement_timestamp()
  returning * into v_checkin;

  v_response := jsonb_build_object(
    'checkin', jsonb_build_object(
      'id', v_checkin.id,
      'week_start', v_checkin.week_start,
      'updated_at', v_checkin.updated_at,
      'trend_summary', v_checkin.trend_summary
    ),
    'safety', jsonb_build_object('level', v_safety_level, 'reasons', v_reasons)
  );

  insert into private.account_audit_events(user_id, event_type, actor_type, metadata)
  values (
    p_user_id,
    'checkin.weekly_saved',
    'service',
    jsonb_build_object(
      'checkin_id', v_checkin.id,
      'week_start', p_week_start,
      'safety_level', v_safety_level,
      'safety_reasons', v_reasons,
      'current_daily_count', v_current_count,
      'previous_daily_count', v_previous_count
    )
  );

  insert into private.account_mutation_keys(
    user_id, action, idempotency_key, request_sha256, response_payload
  ) values (
    p_user_id, 'save-weekly-checkin', p_idempotency_key, p_request_sha256, v_response
  );
  return v_response;
exception
  when unique_violation then
    select * into v_existing
    from private.account_mutation_keys
    where user_id = p_user_id
      and action = 'save-weekly-checkin'
      and idempotency_key = p_idempotency_key;
    if v_existing.request_sha256 = p_request_sha256 then
      return v_existing.response_payload;
    end if;
    raise exception 'idempotency_key_reused' using errcode = 'P0001';
end;
$$;

revoke all on function public.save_weekly_checkin(uuid, date, text, jsonb, text, text)
from public, anon, authenticated;
grant execute on function public.save_weekly_checkin(uuid, date, text, jsonb, text, text)
to service_role;
