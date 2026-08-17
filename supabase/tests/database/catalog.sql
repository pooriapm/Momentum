begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(22);

select extensions.is(
  (select count(*)::integer from public.catalog_releases where status = 'active'),
  1,
  'exactly one governed catalog release is active'
);

select extensions.is(
  (select id from public.catalog_releases where status = 'active'),
  'momentum-core@v2',
  'the active generation catalog is momentum-core@v2'
);

select extensions.is(
  (select status from public.catalog_releases where id = 'momentum-core@v1'),
  'retired',
  'momentum-core@v1 remains as a retired test seed'
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
  (select count(*) >= 40 from public.food_catalog where catalog_release_id = 'momentum-core@v2')
  and (select count(*) >= 20 from public.exercise_catalog where catalog_release_id = 'momentum-core@v2')
  and (select count(*) >= 9 from public.allergen_catalog where catalog_release_id = 'momentum-core@v2')
  and (select count(*) > 0 from public.food_catalog_ingredients fi
       join public.food_catalog f on f.id = fi.food_id
       where f.catalog_release_id = 'momentum-core@v2'),
  'v2 catalog covers a full-month food, exercise and allergen set'
);

select extensions.ok(
  (select count(*) from public.food_catalog where catalog_release_id = 'momentum-core@v1') = 3
  and (select count(*) from public.exercise_catalog where catalog_release_id = 'momentum-core@v1') = 4
  and (select count(*) from public.allergen_catalog where catalog_release_id = 'momentum-core@v1') = 2,
  'v1 test seed stays at 3 foods, 4 exercises and 2 allergens'
);

select extensions.is(
  (select count(*)::integer from (
    select id from public.food_catalog where catalog_release_id = 'momentum-core@v1'
    intersect
    select id from public.food_catalog where catalog_release_id = 'momentum-core@v2'
  ) overlap),
  0,
  'v1 and v2 food IDs are disjoint'
);

select extensions.is(
  (select count(*)::integer from (
    select id from public.exercise_catalog where catalog_release_id = 'momentum-core@v1'
    intersect
    select id from public.exercise_catalog where catalog_release_id = 'momentum-core@v2'
  ) overlap),
  0,
  'v1 and v2 exercise IDs are disjoint'
);

select extensions.ok(
  (select array_agg(slug order by slug) from public.allergen_catalog
    where catalog_release_id = 'momentum-core@v2' and active)
  @> array['egg', 'fish', 'milk', 'peanut', 'sesame', 'shellfish', 'soy', 'tree_nut', 'wheat']::text[],
  'v2 allergen catalog covers the D11 picker families'
);

select extensions.ok(
  (select bool_and(char_length(name_en) > 0 and char_length(name_fa) > 0 and cardinality(aliases) > 0)
    from public.allergen_catalog
    where catalog_release_id = 'momentum-core@v2'),
  'v2 allergens have FA/EN names and aliases for the picker'
);

select extensions.ok(
  (select array_agg(distinct meal_type) from public.food_catalog f
    cross join unnest(f.meal_types) as meal_type
    where f.catalog_release_id = 'momentum-core@v2')
  @> array['breakfast', 'morning_snack', 'lunch', 'afternoon_snack', 'dinner', 'pre_sleep']::text[]
  and exists (
    select 1 from public.food_catalog
    where catalog_release_id = 'momentum-core@v2' and portable
  ),
  'v2 foods cover breakfast, lunch, dinner, snack and portable slots'
);

select extensions.ok(
  (select array_agg(distinct movement_pattern) from public.exercise_catalog
    where catalog_release_id = 'momentum-core@v2')
  @> array['squat', 'hinge', 'push', 'pull', 'carry', 'locomotion', 'mobility']::text[],
  'v2 exercises cover every movement-pattern family'
);

select extensions.ok(
  (select array_agg(distinct a.slug) from public.ingredient_allergens ia
    join public.allergen_catalog a on a.id = ia.allergen_id
    where a.catalog_release_id = 'momentum-core@v2')
  @> array['egg', 'fish', 'milk', 'peanut', 'sesame', 'shellfish', 'soy', 'tree_nut', 'wheat']::text[],
  'ingredient_allergens maps every D11 family so generation is not free-text'
);

select extensions.is(
  (select count(*)::integer from public.food_catalog f
    where f.catalog_release_id = 'momentum-core@v2'
      and not exists (
        select 1 from public.food_catalog_ingredients fi where fi.food_id = f.id
      )),
  0,
  'every v2 food has governed ingredients'
);

select extensions.is(
  (select count(*)::integer from public.exercise_catalog e
    where e.catalog_release_id = 'momentum-core@v2'
      and not exists (
        select 1 from public.exercise_equipment ee where ee.exercise_id = e.id
      )),
  0,
  'every v2 exercise lists equipment'
);

select extensions.ok(
  (select count(*) >= 20 from public.exercise_substitutions s
    join public.exercise_catalog e on e.id = s.exercise_id
    where e.catalog_release_id = 'momentum-core@v2')
  and (select bool_or(cardinality(contraindication_tags) > 0)
    from public.exercise_catalog
    where catalog_release_id = 'momentum-core@v2'),
  'v2 exercises include substitutions and used contraindication tags'
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
  and has_table_privilege('authenticated', 'public.exercise_catalog', 'SELECT')
  and has_table_privilege('authenticated', 'public.allergen_catalog', 'SELECT'),
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
  (select id from public.catalog_releases),
  'momentum-core@v2',
  'authenticated RLS exposes only the active v2 release'
);

select extensions.ok(
  (select count(*) >= 40 from public.food_catalog)
  and (select count(*) from public.food_catalog where id like '%@v1') = 0,
  'authenticated RLS exposes v2 foods and hides the v1 seed'
);

select extensions.ok(
  (select count(*) >= 20 from public.exercise_catalog)
  and (select count(*) from public.exercise_catalog where id like '%@v1') = 0
  and (select count(*) from public.allergen_catalog) = 9,
  'authenticated RLS exposes v2 exercises and the D11 allergen picker set'
);

reset role;
select * from extensions.finish();
rollback;
