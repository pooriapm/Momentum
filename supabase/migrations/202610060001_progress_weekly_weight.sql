begin;

-- Weekly progress already counts real meals, workouts, and check-ins.
-- Also return the average logged weight for that week so the progress
-- page can compare it without inventing a number.
create or replace function public.get_progress_series(p_user_id uuid, p_as_of date)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_result jsonb := '[]'::jsonb;
  v_plan public.plans%rowtype;
  v_content jsonb;
  v_plan_end date;
  v_week_start date;
  v_week_end date;
  v_effective_end date;
  v_date date;
  v_day jsonb;
  v_day_index integer;
  v_meals_planned integer;
  v_meals_completed integer;
  v_workouts_planned integer;
  v_workouts_completed integer;
  v_covered_days integer;
  v_energy_score integer;
  v_energy_total numeric;
  v_energy_count integer;
  v_weight_kg numeric;
  v_weight_total numeric;
  v_weight_count integer;
  v_adherence integer;
begin
  if p_user_id is null or p_as_of is null then
    raise exception 'invalid_progress_arguments' using errcode = '22023';
  end if;
  if not exists (select 1 from public.profiles where user_id = p_user_id) then
    raise exception 'progress_user_not_found' using errcode = 'P0002';
  end if;

  select plan.* into v_plan
  from public.plans plan
  where plan.user_id = p_user_id
    and plan.status = 'active'
    and p_as_of between plan.valid_from and plan.valid_to
    and plan.active_version_id is not null
  order by plan.valid_from desc, plan.created_at desc
  limit 1;

  if not found then
    return v_result;
  end if;

  select version.content into v_content
  from public.plan_versions version
  where version.id = v_plan.active_version_id
    and version.user_id = p_user_id;

  if jsonb_typeof(v_content -> 'days') <> 'array'
    or jsonb_array_length(v_content -> 'days') <> 30
  then
    raise exception 'invalid_monthly_plan_content' using errcode = '22023';
  end if;

  v_plan_end := least(v_plan.valid_to, p_as_of);
  for v_week in 0..4 loop
    v_week_start := v_plan.valid_from + (v_week * 7);
    exit when v_week_start > v_plan_end;
    v_week_end := least(v_week_start + 6, v_plan.valid_to);
    v_effective_end := least(v_week_end, v_plan_end);
    v_meals_planned := 0;
    v_meals_completed := 0;
    v_workouts_planned := 0;
    v_workouts_completed := 0;
    v_covered_days := 0;
    v_energy_total := 0;
    v_energy_count := 0;
    v_weight_total := 0;
    v_weight_count := 0;

    for v_date in
      select generate_series(v_week_start, v_effective_end, interval '1 day')::date
    loop
      v_day_index := v_date - v_plan.valid_from;
      v_day := null;
      select item into v_day
      from jsonb_array_elements(v_content -> 'days') item
      where (item ->> 'day_index')::integer = v_day_index
      limit 1;

      if v_day is null then
        raise exception 'invalid_monthly_plan_content' using errcode = '22023';
      end if;

      v_covered_days := v_covered_days + 1;
      if jsonb_typeof(v_day -> 'meals') = 'array' then
        v_meals_planned := v_meals_planned + jsonb_array_length(v_day -> 'meals');
      end if;
      if jsonb_typeof(v_day -> 'workout') = 'object'
        and jsonb_typeof(v_day -> 'workout' -> 'exercises') = 'array'
        and jsonb_array_length(v_day -> 'workout' -> 'exercises') > 0
      then
        v_workouts_planned := v_workouts_planned + 1;
      end if;
      v_meals_completed := v_meals_completed + (
        select count(*)::integer
        from public.daily_meal_status meal
        where meal.user_id = p_user_id
          and meal.local_date = v_date
          and meal.plan_version_id = v_plan.active_version_id
          and meal.status = 'completed'
      );
      v_workouts_completed := v_workouts_completed + (
        select count(*)::integer
        from public.workout_sessions workout
        where workout.user_id = p_user_id
          and workout.local_date = v_date
          and workout.plan_version_id = v_plan.active_version_id
          and workout.status = 'completed'
      );

      v_energy_score := null;
      v_weight_kg := null;
      select checkin.energy_score, checkin.weight_kg
      into v_energy_score, v_weight_kg
      from public.daily_checkins checkin
      where checkin.user_id = p_user_id and checkin.local_date = v_date;
      if v_energy_score is not null then
        v_energy_total := v_energy_total + v_energy_score;
        v_energy_count := v_energy_count + 1;
      end if;
      if v_weight_kg is not null then
        v_weight_total := v_weight_total + v_weight_kg;
        v_weight_count := v_weight_count + 1;
      end if;
    end loop;

    if v_meals_planned + v_workouts_planned > 0 or v_energy_count > 0 or v_weight_count > 0 then
      v_adherence := case
        when v_meals_planned + v_workouts_planned = 0 then 0
        else round(
          100.0 * (v_meals_completed + v_workouts_completed)
          / (v_meals_planned + v_workouts_planned)
        )::integer
      end;
      v_result := v_result || jsonb_build_array(jsonb_build_object(
        'week', v_week + 1,
        'week_start', v_week_start,
        'week_end', v_week_end,
        'workouts_completed', v_workouts_completed,
        'workouts_planned', v_workouts_planned,
        'meals_completed', v_meals_completed,
        'meals_planned', v_meals_planned,
        'energy', case
          when v_energy_count = 0 then 0
          else round((v_energy_total / v_energy_count) * 2, 1)
        end,
        'weight_kg', case
          when v_weight_count = 0 then null
          else round(v_weight_total / v_weight_count, 2)
        end,
        'adherence', v_adherence,
        'partial', v_effective_end < v_week_end
          or v_covered_days < (v_effective_end - v_week_start + 1)
      ));
    end if;
  end loop;
  return v_result;
end;
$$;

revoke all on function public.get_progress_series(uuid, date)
from public, anon, authenticated;
grant execute on function public.get_progress_series(uuid, date) to service_role;

commit;
