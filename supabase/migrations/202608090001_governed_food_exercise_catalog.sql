begin;

create table public.catalog_releases (
  id text primary key check (id ~ '^[a-z][a-z0-9._-]{1,79}@v[1-9][0-9]*$'),
  version integer not null check (version > 0),
  status text not null check (status in ('draft', 'active', 'retired')),
  released_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  constraint catalog_releases_active_has_date check (
    status <> 'active' or released_at is not null
  )
);

create unique index catalog_releases_one_active_idx
on public.catalog_releases ((status)) where status = 'active';

create table public.allergen_catalog (
  id text primary key check (id ~ '^allergen:[a-z0-9._-]+@v[1-9][0-9]*$'),
  catalog_release_id text not null references public.catalog_releases(id),
  slug text not null check (slug ~ '^[a-z][a-z0-9_-]{1,79}$'),
  name_en text not null check (char_length(name_en) between 1 and 120),
  name_fa text not null check (char_length(name_fa) between 1 and 120),
  aliases text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default statement_timestamp(),
  constraint allergen_catalog_release_slug_unique unique (catalog_release_id, slug),
  constraint allergen_catalog_alias_limit check (cardinality(aliases) <= 30)
);

create table public.ingredient_catalog (
  id text primary key check (id ~ '^ingredient:[a-z0-9._-]+@v[1-9][0-9]*$'),
  catalog_release_id text not null references public.catalog_releases(id),
  slug text not null check (slug ~ '^[a-z][a-z0-9_-]{1,79}$'),
  name_en text not null check (char_length(name_en) between 1 and 160),
  name_fa text not null check (char_length(name_fa) between 1 and 160),
  default_unit text not null
    check (default_unit in ('g', 'ml', 'piece', 'tbsp', 'tsp', 'cup', 'slice', 'serving')),
  active boolean not null default true,
  created_at timestamptz not null default statement_timestamp(),
  constraint ingredient_catalog_release_slug_unique unique (catalog_release_id, slug)
);

create table public.ingredient_allergens (
  ingredient_id text not null references public.ingredient_catalog(id) on delete cascade,
  allergen_id text not null references public.allergen_catalog(id) on delete restrict,
  relation text not null check (relation in ('contains', 'may_contain')),
  primary key (ingredient_id, allergen_id)
);

create table public.food_catalog (
  id text primary key check (id ~ '^food:[a-z0-9._-]+@v[1-9][0-9]*$'),
  catalog_release_id text not null references public.catalog_releases(id),
  slug text not null check (slug ~ '^[a-z][a-z0-9_-]{1,79}$'),
  name_en text not null check (char_length(name_en) between 1 and 240),
  name_fa text not null check (char_length(name_fa) between 1 and 240),
  meal_types text[] not null,
  calories numeric(7,2) not null check (calories between 0 and 10000),
  protein_g numeric(7,2) not null check (protein_g between 0 and 1000),
  carbs_g numeric(7,2) not null check (carbs_g between 0 and 1000),
  fat_g numeric(7,2) not null check (fat_g between 0 and 1000),
  fiber_g numeric(7,2) not null check (fiber_g between 0 and 200),
  portable boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default statement_timestamp(),
  constraint food_catalog_release_slug_unique unique (catalog_release_id, slug),
  constraint food_catalog_meal_types_valid check (
    cardinality(meal_types) between 1 and 6
    and meal_types <@ array[
      'breakfast', 'morning_snack', 'lunch', 'afternoon_snack', 'dinner', 'pre_sleep'
    ]::text[]
  )
);

create table public.food_catalog_ingredients (
  food_id text not null references public.food_catalog(id) on delete cascade,
  ingredient_id text not null references public.ingredient_catalog(id) on delete restrict,
  amount numeric(10,2) not null check (amount > 0 and amount <= 100000),
  unit text not null
    check (unit in ('g', 'ml', 'piece', 'tbsp', 'tsp', 'cup', 'slice', 'serving')),
  position smallint not null check (position between 1 and 100),
  primary key (food_id, ingredient_id),
  constraint food_catalog_ingredients_position_unique unique (food_id, position)
);

create table public.equipment_catalog (
  id text primary key check (id ~ '^equipment:[a-z0-9._-]+@v[1-9][0-9]*$'),
  catalog_release_id text not null references public.catalog_releases(id),
  slug text not null check (slug ~ '^[a-z][a-z0-9_-]{1,79}$'),
  name_en text not null check (char_length(name_en) between 1 and 120),
  name_fa text not null check (char_length(name_fa) between 1 and 120),
  active boolean not null default true,
  created_at timestamptz not null default statement_timestamp(),
  constraint equipment_catalog_release_slug_unique unique (catalog_release_id, slug)
);

create table public.exercise_catalog (
  id text primary key check (id ~ '^exercise:[a-z0-9._-]+@v[1-9][0-9]*$'),
  catalog_release_id text not null references public.catalog_releases(id),
  slug text not null check (slug ~ '^[a-z][a-z0-9_-]{1,79}$'),
  name_en text not null check (char_length(name_en) between 1 and 160),
  name_fa text not null check (char_length(name_fa) between 1 and 160),
  movement_pattern text not null
    check (movement_pattern in ('squat', 'hinge', 'push', 'pull', 'carry', 'locomotion', 'mobility')),
  instructions_en text not null check (char_length(instructions_en) between 1 and 1000),
  instructions_fa text not null check (char_length(instructions_fa) between 1 and 1000),
  contraindication_tags text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default statement_timestamp(),
  constraint exercise_catalog_release_slug_unique unique (catalog_release_id, slug),
  constraint exercise_catalog_contraindication_limit check (cardinality(contraindication_tags) <= 30)
);

create table public.exercise_equipment (
  exercise_id text not null references public.exercise_catalog(id) on delete cascade,
  equipment_id text not null references public.equipment_catalog(id) on delete restrict,
  required boolean not null default true,
  primary key (exercise_id, equipment_id)
);

create table public.exercise_substitutions (
  exercise_id text not null references public.exercise_catalog(id) on delete cascade,
  substitute_exercise_id text not null references public.exercise_catalog(id) on delete cascade,
  reason text not null check (char_length(reason) between 1 and 240),
  primary key (exercise_id, substitute_exercise_id),
  constraint exercise_substitutions_not_self check (exercise_id <> substitute_exercise_id)
);

alter table public.catalog_releases enable row level security;
alter table public.allergen_catalog enable row level security;
alter table public.ingredient_catalog enable row level security;
alter table public.ingredient_allergens enable row level security;
alter table public.food_catalog enable row level security;
alter table public.food_catalog_ingredients enable row level security;
alter table public.equipment_catalog enable row level security;
alter table public.exercise_catalog enable row level security;
alter table public.exercise_equipment enable row level security;
alter table public.exercise_substitutions enable row level security;

revoke all on table
  public.catalog_releases,
  public.allergen_catalog,
  public.ingredient_catalog,
  public.ingredient_allergens,
  public.food_catalog,
  public.food_catalog_ingredients,
  public.equipment_catalog,
  public.exercise_catalog,
  public.exercise_equipment,
  public.exercise_substitutions
from anon, authenticated;

grant select on table
  public.catalog_releases,
  public.allergen_catalog,
  public.ingredient_catalog,
  public.ingredient_allergens,
  public.food_catalog,
  public.food_catalog_ingredients,
  public.equipment_catalog,
  public.exercise_catalog,
  public.exercise_equipment,
  public.exercise_substitutions
to authenticated;

create policy catalog_releases_read_active on public.catalog_releases
for select to authenticated using (status = 'active');
create policy allergen_catalog_read_active on public.allergen_catalog
for select to authenticated using (
  active and exists (
    select 1 from public.catalog_releases r
    where r.id = catalog_release_id and r.status = 'active'
  )
);
create policy ingredient_catalog_read_active on public.ingredient_catalog
for select to authenticated using (
  active and exists (
    select 1 from public.catalog_releases r
    where r.id = catalog_release_id and r.status = 'active'
  )
);
create policy ingredient_allergens_read_active on public.ingredient_allergens
for select to authenticated using (
  exists (select 1 from public.ingredient_catalog i where i.id = ingredient_id and i.active)
  and exists (select 1 from public.allergen_catalog a where a.id = allergen_id and a.active)
);
create policy food_catalog_read_active on public.food_catalog
for select to authenticated using (
  active and exists (
    select 1 from public.catalog_releases r
    where r.id = catalog_release_id and r.status = 'active'
  )
);
create policy food_catalog_ingredients_read_active on public.food_catalog_ingredients
for select to authenticated using (
  exists (select 1 from public.food_catalog f where f.id = food_id and f.active)
  and exists (select 1 from public.ingredient_catalog i where i.id = ingredient_id and i.active)
);
create policy equipment_catalog_read_active on public.equipment_catalog
for select to authenticated using (
  active and exists (
    select 1 from public.catalog_releases r
    where r.id = catalog_release_id and r.status = 'active'
  )
);
create policy exercise_catalog_read_active on public.exercise_catalog
for select to authenticated using (
  active and exists (
    select 1 from public.catalog_releases r
    where r.id = catalog_release_id and r.status = 'active'
  )
);
create policy exercise_equipment_read_active on public.exercise_equipment
for select to authenticated using (
  exists (select 1 from public.exercise_catalog e where e.id = exercise_id and e.active)
  and exists (select 1 from public.equipment_catalog q where q.id = equipment_id and q.active)
);
create policy exercise_substitutions_read_active on public.exercise_substitutions
for select to authenticated using (
  exists (select 1 from public.exercise_catalog e where e.id = exercise_id and e.active)
  and exists (
    select 1 from public.exercise_catalog s where s.id = substitute_exercise_id and s.active
  )
);

-- Synthetic launch-gate data. It is intentionally small and must be replaced or
-- expanded only through a reviewed catalog release, never from model output.
insert into public.catalog_releases(id, version, status, released_at)
values ('momentum-core@v1', 1, 'active', statement_timestamp());

insert into public.allergen_catalog(id, catalog_release_id, slug, name_en, name_fa, aliases)
values
  ('allergen:milk@v1', 'momentum-core@v1', 'milk', 'Milk', 'شیر', array['dairy', 'lactose', 'لبنیات']),
  ('allergen:peanut@v1', 'momentum-core@v1', 'peanut', 'Peanut', 'بادام زمینی', array['groundnut', 'بادام‌زمینی']);

insert into public.ingredient_catalog(id, catalog_release_id, slug, name_en, name_fa, default_unit)
values
  ('ingredient:brown-rice@v1', 'momentum-core@v1', 'brown-rice', 'Cooked brown rice', 'برنج قهوه‌ای پخته', 'g'),
  ('ingredient:chicken-breast@v1', 'momentum-core@v1', 'chicken-breast', 'Cooked chicken breast', 'سینه مرغ پخته', 'g'),
  ('ingredient:olive-oil@v1', 'momentum-core@v1', 'olive-oil', 'Olive oil', 'روغن زیتون', 'tsp'),
  ('ingredient:banana@v1', 'momentum-core@v1', 'banana', 'Banana', 'موز', 'piece'),
  ('ingredient:red-lentils@v1', 'momentum-core@v1', 'red-lentils', 'Cooked red lentils', 'عدس قرمز پخته', 'g'),
  ('ingredient:spinach@v1', 'momentum-core@v1', 'spinach', 'Spinach', 'اسفناج', 'g');

insert into public.food_catalog(
  id, catalog_release_id, slug, name_en, name_fa, meal_types,
  calories, protein_g, carbs_g, fat_g, fiber_g, portable
)
values
  ('food:banana-snack@v1', 'momentum-core@v1', 'banana-snack', 'Banana snack', 'میان‌وعده موز',
    array['breakfast', 'morning_snack', 'afternoon_snack'], 400, 10, 75, 6, 8, true),
  ('food:chicken-rice-bowl@v1', 'momentum-core@v1', 'chicken-rice-bowl', 'Chicken and rice bowl', 'کاسه مرغ و برنج',
    array['lunch', 'dinner'], 650, 45, 75, 19, 7, false),
  ('food:lentil-rice-bowl@v1', 'momentum-core@v1', 'lentil-rice-bowl', 'Lentil and rice bowl', 'کاسه عدس و برنج',
    array['lunch', 'dinner'], 650, 25, 100, 17, 18, false);

insert into public.food_catalog_ingredients(food_id, ingredient_id, amount, unit, position)
values
  ('food:banana-snack@v1', 'ingredient:banana@v1', 2, 'piece', 1),
  ('food:chicken-rice-bowl@v1', 'ingredient:brown-rice@v1', 250, 'g', 1),
  ('food:chicken-rice-bowl@v1', 'ingredient:chicken-breast@v1', 180, 'g', 2),
  ('food:chicken-rice-bowl@v1', 'ingredient:olive-oil@v1', 2, 'tsp', 3),
  ('food:chicken-rice-bowl@v1', 'ingredient:spinach@v1', 80, 'g', 4),
  ('food:lentil-rice-bowl@v1', 'ingredient:brown-rice@v1', 200, 'g', 1),
  ('food:lentil-rice-bowl@v1', 'ingredient:red-lentils@v1', 250, 'g', 2),
  ('food:lentil-rice-bowl@v1', 'ingredient:olive-oil@v1', 2, 'tsp', 3),
  ('food:lentil-rice-bowl@v1', 'ingredient:spinach@v1', 80, 'g', 4);

insert into public.equipment_catalog(id, catalog_release_id, slug, name_en, name_fa)
values
  ('equipment:bodyweight@v1', 'momentum-core@v1', 'bodyweight', 'Bodyweight', 'وزن بدن'),
  ('equipment:wall@v1', 'momentum-core@v1', 'wall', 'Wall', 'دیوار');

insert into public.exercise_catalog(
  id, catalog_release_id, slug, name_en, name_fa, movement_pattern,
  instructions_en, instructions_fa
)
values
  ('exercise:bodyweight-squat@v1', 'momentum-core@v1', 'bodyweight-squat', 'Bodyweight squat', 'اسکوات با وزن بدن', 'squat',
    'Sit back with control and stand while keeping the knees aligned with the feet.',
    'با کنترل به عقب بنشینید و با هم‌راستا نگه‌داشتن زانو و پا بایستید.'),
  ('exercise:incline-wall-pushup@v1', 'momentum-core@v1', 'incline-wall-pushup', 'Wall push-up', 'شنا روی دیوار', 'push',
    'Keep a straight body line, lower toward the wall, then press away with control.',
    'بدن را در یک خط نگه دارید، به دیوار نزدیک شوید و با کنترل فشار دهید.'),
  ('exercise:glute-bridge@v1', 'momentum-core@v1', 'glute-bridge', 'Glute bridge', 'پل باسن', 'hinge',
    'Press through the feet and lift the hips without arching the lower back.',
    'از پاها فشار دهید و بدون قوس اضافی کمر، لگن را بالا بیاورید.'),
  ('exercise:brisk-walk@v1', 'momentum-core@v1', 'brisk-walk', 'Brisk walk', 'پیاده‌روی تند', 'locomotion',
    'Walk at a pace that raises breathing while allowing short sentences.',
    'با سرعتی راه بروید که نفس را بالا ببرد ولی امکان گفتن جمله کوتاه باشد.');

insert into public.exercise_equipment(exercise_id, equipment_id, required)
values
  ('exercise:bodyweight-squat@v1', 'equipment:bodyweight@v1', true),
  ('exercise:incline-wall-pushup@v1', 'equipment:bodyweight@v1', true),
  ('exercise:incline-wall-pushup@v1', 'equipment:wall@v1', true),
  ('exercise:glute-bridge@v1', 'equipment:bodyweight@v1', true),
  ('exercise:brisk-walk@v1', 'equipment:bodyweight@v1', true);

insert into public.exercise_substitutions(exercise_id, substitute_exercise_id, reason)
values
  ('exercise:bodyweight-squat@v1', 'exercise:glute-bridge@v1', 'Lower-impact posterior-chain option'),
  ('exercise:glute-bridge@v1', 'exercise:bodyweight-squat@v1', 'Standing lower-body option');

commit;
