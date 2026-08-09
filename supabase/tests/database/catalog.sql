begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(8);

select extensions.is(
  (select count(*)::integer from public.catalog_releases where status = 'active'),
  1,
  'exactly one governed catalog release is active'
);

select extensions.ok(
  (select bool_and(id ~ '^[a-z][a-z0-9._:-]+@v[1-9][0-9]*$') from (
    select id from public.allergen_catalog
    union all select id from public.ingredient_catalog
    union all select id from public.food_catalog
    union all select id from public.equipment_catalog
    union all select id from public.exercise_catalog
  ) catalog_ids),
  'every canonical ID carries an explicit version'
);

select extensions.ok(
  (select count(*) > 0 from public.food_catalog)
  and (select count(*) > 0 from public.exercise_catalog)
  and (select count(*) > 0 from public.food_catalog_ingredients),
  'the synthetic starter catalog has foods, ingredients and exercises'
);

select extensions.ok(
  (select bool_and(relrowsecurity) from pg_catalog.pg_class
    where oid in (
      'public.catalog_releases'::regclass,
      'public.allergen_catalog'::regclass,
      'public.ingredient_catalog'::regclass,
      'public.ingredient_allergens'::regclass,
      'public.food_catalog'::regclass,
      'public.food_catalog_ingredients'::regclass,
      'public.equipment_catalog'::regclass,
      'public.exercise_catalog'::regclass,
      'public.exercise_equipment'::regclass,
      'public.exercise_substitutions'::regclass
    )),
  'RLS is enabled on every catalog table'
);

select extensions.ok(
  has_table_privilege('authenticated', 'public.food_catalog', 'SELECT')
  and has_table_privilege('authenticated', 'public.exercise_catalog', 'SELECT'),
  'authenticated users can read governed catalog entries'
);

select extensions.ok(
  not has_table_privilege('authenticated', 'public.food_catalog', 'INSERT')
  and not has_table_privilege('authenticated', 'public.food_catalog', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.food_catalog', 'DELETE')
  and not has_table_privilege('authenticated', 'public.exercise_catalog', 'INSERT')
  and not has_table_privilege('authenticated', 'public.exercise_catalog', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.exercise_catalog', 'DELETE'),
  'authenticated users cannot mutate governed catalogs'
);

set local role authenticated;

select extensions.is(
  (select count(*)::integer from public.food_catalog),
  3,
  'authenticated RLS exposes active foods in the active release'
);

select extensions.is(
  (select count(*)::integer from public.exercise_catalog),
  4,
  'authenticated RLS exposes active exercises in the active release'
);

reset role;
select * from extensions.finish();
rollback;
