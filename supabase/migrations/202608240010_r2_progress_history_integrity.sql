begin;

create or replace function private.reject_plan_version_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'plan_version_immutable' using errcode = '55000';
end;
$$;

revoke all on function private.reject_plan_version_mutation()
from public, anon, authenticated, service_role;

create trigger plan_versions_immutable_guard
before update on public.plan_versions
for each row execute function private.reject_plan_version_mutation();

create or replace function public.get_progress_series(p_user_id uuid, p_as_of date)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_result jsonb := '[]'::jsonb;
  v_window_start date;
  v_week_start date;
  v_week_end date;
  v_effective_end date;
  v_date date;
  v_plan public.plans%rowtype;
  v_content jsonb;
  v_day jsonb;
  v_day_index integer;
  v_template_length integer;
  v_meals_planned integer;
  v_meals_completed integer;
  v_workouts_planned integer;
  v_workouts_completed integer;
  v_covered_days integer;
  v_energy_total numeric;
  v_energy_count integer;
  v_adherence integer;
begin
  if p_user_id is null or p_as_of is null then
    raise exception 'invalid_progress_arguments' using errcode = '22023';
  end if;
  if not exists (select 1 from public.profiles where user_id = p_user_id) then
    raise exception 'progress_user_not_found' using errcode = 'P0002';
  end if;

  v_window_start := date_trunc('week', p_as_of::timestamp)::date - 21;
  for v_week in 0..3 loop
    v_week_start := v_window_start + (v_week * 7);
    v_week_end := v_week_start + 6;
    v_effective_end := least(v_week_end, p_as_of);
    v_meals_planned := 0;
    v_meals_completed := 0;
    v_workouts_planned := 0;
    v_workouts_completed := 0;
    v_covered_days := 0;
    v_energy_total := 0;
    v_energy_count := 0;

    if v_effective_end >= v_week_start then
      for v_date in select generate_series(v_week_start, v_effective_end, interval '1 day')::date loop
        select plan.* into v_plan
        from public.plans plan
        where plan.user_id = p_user_id
          and plan.status in ('active', 'archived', 'superseded')
          and v_date between plan.valid_from and plan.valid_to
          and plan.active_version_id is not null
        order by
          case when plan.status = 'active' then 0 else 1 end,
          plan.valid_from desc,
          plan.created_at desc
        limit 1;

        if found then
          select version.content into v_content
          from public.plan_versions version
          where version.id = v_plan.active_version_id
            and version.user_id = p_user_id;
          v_template_length := case
            when jsonb_typeof(v_content->'days') = 'array' then jsonb_array_length(v_content->'days')
            else 0
          end;
          if v_template_length > 0 then
            v_day_index := (v_date - v_plan.valid_from) % v_template_length;
            select item into v_day
            from jsonb_array_elements(v_content->'days') item
            where (item->>'day_index')::integer = v_day_index
            limit 1;
            if v_day is not null then
              v_covered_days := v_covered_days + 1;
              if jsonb_typeof(v_day->'meals') = 'array' then
                v_meals_planned := v_meals_planned + jsonb_array_length(v_day->'meals');
              end if;
              if jsonb_typeof(v_day->'workout') = 'object'
                and jsonb_typeof(v_day->'workout'->'exercises') = 'array'
                and jsonb_array_length(v_day->'workout'->'exercises') > 0
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
            end if;
          end if;
        end if;

        v_day_index := null;
        select checkin.energy_score into v_day_index
        from public.daily_checkins checkin
        where checkin.user_id = p_user_id and checkin.local_date = v_date;
        if v_day_index is not null then
          v_energy_total := v_energy_total + v_day_index;
          v_energy_count := v_energy_count + 1;
        end if;
      end loop;
    end if;

    if v_meals_planned + v_workouts_planned > 0 or v_energy_count > 0 then
      v_adherence := case
        when v_meals_planned + v_workouts_planned = 0 then 0
        else round(
          100.0 * (v_meals_completed + v_workouts_completed)
          / (v_meals_planned + v_workouts_planned)
        )::integer
      end;
      v_result := v_result || jsonb_build_array(jsonb_build_object(
        'week', jsonb_array_length(v_result) + 1,
        'week_start', v_week_start,
        'week_end', v_week_end,
        'workouts_completed', v_workouts_completed,
        'workouts_planned', v_workouts_planned,
        'meals_completed', v_meals_completed,
        'meals_planned', v_meals_planned,
        'energy', case when v_energy_count = 0 then 0 else round((v_energy_total / v_energy_count) * 2, 1) end,
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
