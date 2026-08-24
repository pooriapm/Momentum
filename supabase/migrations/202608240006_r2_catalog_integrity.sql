begin;

create or replace function public.enforce_catalog_item_version()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_release_version integer;
  v_item_version integer;
begin
  select version
  into v_release_version
  from public.catalog_releases
  where id = new.catalog_release_id;

  v_item_version := nullif(substring(new.id from '@v([1-9][0-9]*)$'), '')::integer;
  if v_release_version is null or v_item_version is distinct from v_release_version then
    raise exception 'catalog_item_version_mismatch' using errcode = '23514';
  end if;
  return new;
end;
$$;

create or replace function public.enforce_catalog_relation_integrity()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_left_release text;
  v_right_release text;
  v_default_unit text;
begin
  case tg_table_name
    when 'ingredient_allergens' then
      select catalog_release_id into v_left_release
      from public.ingredient_catalog where id = new.ingredient_id;
      select catalog_release_id into v_right_release
      from public.allergen_catalog where id = new.allergen_id;
    when 'food_catalog_ingredients' then
      select catalog_release_id into v_left_release
      from public.food_catalog where id = new.food_id;
      select catalog_release_id, default_unit into v_right_release, v_default_unit
      from public.ingredient_catalog where id = new.ingredient_id;
      if new.unit is distinct from v_default_unit then
        raise exception 'catalog_ingredient_unit_mismatch' using errcode = '23514';
      end if;
    when 'exercise_equipment' then
      select catalog_release_id into v_left_release
      from public.exercise_catalog where id = new.exercise_id;
      select catalog_release_id into v_right_release
      from public.equipment_catalog where id = new.equipment_id;
    when 'exercise_substitutions' then
      select catalog_release_id into v_left_release
      from public.exercise_catalog where id = new.exercise_id;
      select catalog_release_id into v_right_release
      from public.exercise_catalog where id = new.substitute_exercise_id;
    else
      raise exception 'unsupported_catalog_relation' using errcode = '23514';
  end case;

  if v_left_release is null or v_right_release is null or v_left_release <> v_right_release then
    raise exception 'catalog_relation_release_mismatch' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_catalog_item_version() from public, anon, authenticated, service_role;
revoke all on function public.enforce_catalog_relation_integrity() from public, anon, authenticated, service_role;

do $$
begin
  if exists (
    select 1
    from (
      select id, catalog_release_id from public.allergen_catalog
      union all select id, catalog_release_id from public.ingredient_catalog
      union all select id, catalog_release_id from public.food_catalog
      union all select id, catalog_release_id from public.equipment_catalog
      union all select id, catalog_release_id from public.exercise_catalog
    ) item
    join public.catalog_releases release on release.id = item.catalog_release_id
    where substring(item.id from '@v([1-9][0-9]*)$')::integer <> release.version
  ) then
    raise exception 'catalog_item_version_mismatch' using errcode = '23514';
  end if;

  if exists (
    select 1 from public.ingredient_allergens relation
    join public.ingredient_catalog ingredient on ingredient.id = relation.ingredient_id
    join public.allergen_catalog allergen on allergen.id = relation.allergen_id
    where ingredient.catalog_release_id <> allergen.catalog_release_id
  ) or exists (
    select 1 from public.food_catalog_ingredients relation
    join public.food_catalog food on food.id = relation.food_id
    join public.ingredient_catalog ingredient on ingredient.id = relation.ingredient_id
    where food.catalog_release_id <> ingredient.catalog_release_id
       or relation.unit <> ingredient.default_unit
  ) or exists (
    select 1 from public.exercise_equipment relation
    join public.exercise_catalog exercise on exercise.id = relation.exercise_id
    join public.equipment_catalog equipment on equipment.id = relation.equipment_id
    where exercise.catalog_release_id <> equipment.catalog_release_id
  ) or exists (
    select 1 from public.exercise_substitutions relation
    join public.exercise_catalog exercise on exercise.id = relation.exercise_id
    join public.exercise_catalog substitute on substitute.id = relation.substitute_exercise_id
    where exercise.catalog_release_id <> substitute.catalog_release_id
  ) then
    raise exception 'catalog_relation_integrity_invalid' using errcode = '23514';
  end if;
end;
$$;

create trigger allergen_catalog_version_guard
before insert or update of id, catalog_release_id on public.allergen_catalog
for each row execute function public.enforce_catalog_item_version();

create trigger ingredient_catalog_version_guard
before insert or update of id, catalog_release_id on public.ingredient_catalog
for each row execute function public.enforce_catalog_item_version();

create trigger food_catalog_version_guard
before insert or update of id, catalog_release_id on public.food_catalog
for each row execute function public.enforce_catalog_item_version();

create trigger equipment_catalog_version_guard
before insert or update of id, catalog_release_id on public.equipment_catalog
for each row execute function public.enforce_catalog_item_version();

create trigger exercise_catalog_version_guard
before insert or update of id, catalog_release_id on public.exercise_catalog
for each row execute function public.enforce_catalog_item_version();

create trigger ingredient_allergens_release_guard
before insert or update of ingredient_id, allergen_id on public.ingredient_allergens
for each row execute function public.enforce_catalog_relation_integrity();

create trigger food_catalog_ingredients_release_guard
before insert or update of food_id, ingredient_id, unit on public.food_catalog_ingredients
for each row execute function public.enforce_catalog_relation_integrity();

create trigger exercise_equipment_release_guard
before insert or update of exercise_id, equipment_id on public.exercise_equipment
for each row execute function public.enforce_catalog_relation_integrity();

create trigger exercise_substitutions_release_guard
before insert or update of exercise_id, substitute_exercise_id on public.exercise_substitutions
for each row execute function public.enforce_catalog_relation_integrity();

commit;
