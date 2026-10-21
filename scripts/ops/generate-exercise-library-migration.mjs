// Generates a catalog migration from the Android exercise library (library.json), so the
// plan generator can only choose exercises that also have a guide and animation on the phone.
//
// Refresh after the library changes (Momentum-android/media/tools/exercise_library.py):
//   node scripts/ops/generate-exercise-library-migration.mjs \
//     ../Momentum-android/media/exercise/v1/library.json \
//     supabase/migrations/<timestamp>_exercise_library_catalog_refresh.sql
// Existing catalog rows are never changed (ids stay stable for saved plans and workout logs);
// only new ids are added. An equipment label without a mapping below fails the run on purpose.
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const RELEASE_ID = 'momentum-core@v2'
const RELEASE_VERSION = 2

const [, , libraryArg, outArg] = process.argv
const libraryPath = resolve(libraryArg ?? '../Momentum-android/media/exercise/v1/library.json')
const outPath = resolve(outArg ?? 'supabase/migrations/202610190101_exercise_library_catalog.sql')

// Equipment the v2 catalog does not have yet. Existing v2 slugs: bodyweight, wall, yoga-mat,
// chair, dumbbells, resistance-band, kettlebell, jump-rope.
const NEW_EQUIPMENT = {
  barbell: ['Barbell', 'هالتر'],
  bench: ['Bench', 'نیمکت'],
  cable: ['Cable machine', 'سیم‌کش'],
  machine: ['Gym machine', 'دستگاه'],
  'smith-machine': ['Smith machine', 'دستگاه اسمیت'],
  'squat-rack': ['Squat rack', 'رک'],
  trx: ['Suspension trainer (TRX)', 'TRX'],
  'pull-up-bar': ['Pull-up bar', 'میله بارفیکس'],
  'dip-bars': ['Dip bars', 'پارالل'],
  box: ['Plyo box or step', 'جعبه یا سکو'],
  'weight-plate': ['Weight plate', 'صفحه وزنه'],
  'medicine-ball': ['Medicine ball', 'توپ طبی'],
  'gymnastic-rings': ['Gymnastic rings', 'حلقه ژیمناستیک'],
  landmine: ['Landmine', 'لندماین'],
  'ab-wheel': ['Ab wheel', 'چرخ شکم'],
  'battle-rope': ['Battle rope', 'طناب بتل'],
  sled: ['Sled', 'سورتمه'],
  sandbag: ['Sandbag', 'کیسه شن'],
  treadmill: ['Treadmill', 'تردمیل'],
  'stationary-bike': ['Stationary bike', 'دوچرخه ثابت'],
  'rowing-machine': ['Rowing machine', 'دستگاه روئینگ'],
  elliptical: ['Elliptical', 'الپتیکال'],
  'stair-machine': ['Stair machine', 'دستگاه پله'],
  'ski-erg': ['Ski erg', 'اسکی ارگ'],
  pool: ['Swimming pool', 'استخر'],
  'foam-roller': ['Foam roller', 'فوم رولر'],
}

// Library label (Persian, free text) -> catalog equipment slug. "A یا B" maps to A: the
// catalog treats every listed item as required, so the first option is the honest one.
const EQUIPMENT_BY_LABEL = {
  'دمبل': 'dumbbells',
  'مت': 'yoga-mat',
  'هالتر': 'barbell',
  'TRX': 'trx',
  'سیم‌کش': 'cable',
  'کش مقاومتی': 'resistance-band',
  'کتل‌بل': 'kettlebell',
  'نیمکت': 'bench',
  'دستگاه': 'machine',
  'دیوار': 'wall',
  'دستگاه اسمیت': 'smith-machine',
  'طناب': 'jump-rope',
  'دمبل یا کتل‌بل': 'dumbbells',
  'نیمکت شیب‌دار': 'bench',
  'میله بارفیکس': 'pull-up-bar',
  'مینی‌بند': 'resistance-band',
  'رک': 'squat-rack',
  'پارالل': 'dip-bars',
  'صفحه وزنه': 'weight-plate',
  'سکو': 'box',
  'هالتر یا دمبل': 'barbell',
  'دستگاه پک‌دک': 'machine',
  'دستگاه لت': 'machine',
  'میله': 'pull-up-bar',
  'دمبل یا هالتر': 'dumbbells',
  'جعبه': 'box',
  'توپ طبی': 'medicine-ball',
  'حلقه ژیمناستیک': 'gymnastic-rings',
  'تردمیل': 'treadmill',
  'لندماین': 'landmine',
  'کتل‌بل یا دمبل': 'kettlebell',
  'صندلی': 'chair',
  'سکو یا پله': 'box',
  'دمبل یا کش': 'dumbbells',
  'دستگاه هاک': 'machine',
  'جعبه یا صندلی': 'box',
  'دمبل اختیاری': 'bodyweight',
  'هالتر یا وزن بدن': 'bodyweight',
  'دستگاه فیله کمر': 'machine',
  'نیمکت شیب منفی': 'bench',
  'دستگاه پرس سینه': 'machine',
  'نیمکت یا سکو': 'bench',
  'دستگاه تی‌بار': 'machine',
  'دستگاه یا کش کمکی': 'machine',
  'میله کوتاه': 'barbell',
  'میز لاری': 'bench',
  'دستگاه پرس پا': 'machine',
  'دستگاه جلوپا': 'machine',
  'دستگاه پشت‌پا': 'machine',
  'دستگاه پشت‌پا نشسته': 'machine',
  'دستگاه ابداکتور': 'machine',
  'دستگاه اداکتور': 'machine',
  'دستگاه ساق نشسته': 'machine',
  'دستگاه ساق': 'machine',
  'دستگاه GHD': 'machine',
  'توپ یا صفحه وزنه': 'medicine-ball',
  'چرخ شکم': 'ab-wheel',
  'کش یا سیم‌کش': 'resistance-band',
  'سیم‌کش یا دمبل': 'cable',
  'طناب بتل': 'battle-rope',
  'سورتمه': 'sled',
  'کیسه شن': 'sandbag',
  'دوچرخه ثابت': 'stationary-bike',
  'دستگاه روئینگ': 'rowing-machine',
  'الپتیکال': 'elliptical',
  'دستگاه پله': 'stair-machine',
  'دوچرخه ایر': 'stationary-bike',
  'اسکی ارگ': 'ski-erg',
  'استخر': 'pool',
  'دیوار یا چارچوب در': 'wall',
  'فوم رولر': 'foam-roller',
  'دستگاه جلوبازو': 'machine',
  'دستگاه دیپ': 'machine',
  'دستگاه شکم': 'machine',
}

// Coarse movement family, informational only (the generator never reads it). First match wins.
const MOVEMENT_RULES = [
  ['mobility', (e) => e.cat === 'mobility'],
  ['locomotion', (e) => e.cat === 'cardio' || /(assault-bike|ski-erg|double-under|calf)/.test(e.id)],
  ['carry', (e) => /carry/.test(e.id)],
  ['core', (e) => /(crunch|situp|plank|hollow|v-up|leg-raise|knee-raise|toes-to-bar|twist|ab-wheel|pallof|woodchop|pike|knee-tuck|heel-touch|mountain-climber|flutter|l-sit|bear-crawl)/.test(e.id)],
  ['hinge', (e) => /(deadlift|rdl|swing|clean|snatch|good-morning|hip-thrust|bridge|back-extension|superman|donkey|glute-kickback|band-kickback|hydrant|leg-curl|hamstring|nordic|glute-ham|pull-through|frog|hip-press|rack-pull)/.test(e.id)],
  ['squat', (e) => /(squat|lunge|step-up|leg-press|leg-extension|wall-sit|wall-ball|thruster|jump|abduction|adduction|clamshell|lateral-walk)/.test(e.id)],
  ['pull', (e) => /(row|pull|chin|curl|face|shrug|rear-delt|reverse-pec|y-raise|muscle-up|halo)/.test(e.id)],
  ['push', (e) => /(press|push|dip|fly|crossover|pec-deck|raise|extension|crusher|kickback|pullover|handstand)/.test(e.id)],
  ['other', () => true],
]

function sql(value) {
  return `'${String(value).replaceAll("'", "''")}'`
}

function fail(message) {
  console.error(message)
  process.exit(1)
}

const library = JSON.parse(readFileSync(libraryPath, 'utf8'))
if (!Array.isArray(library.exercises) || library.exercises.length === 0) fail('No exercises.')

const seen = new Set()
const rows = []
for (const e of library.exercises) {
  if (!/^[a-z][a-z0-9_-]{1,79}$/.test(e.id ?? '')) fail(`Bad exercise id: ${e.id}`)
  if (seen.has(e.id)) fail(`Duplicate exercise id: ${e.id}`)
  seen.add(e.id)
  if (!e.fa || !e.en || !Array.isArray(e.steps) || e.steps.length === 0) {
    fail(`Exercise ${e.id} needs fa, en and steps.`)
  }
  const equipment = new Set()
  for (const label of e.eq ?? []) {
    const slug = EQUIPMENT_BY_LABEL[label]
    if (!slug) fail(`Equipment label without a catalog mapping: ${label} (${e.id})`)
    equipment.add(slug)
  }
  if (equipment.size === 0) equipment.add('bodyweight')
  const movement = MOVEMENT_RULES.find(([, test]) => test(e))[0]
  rows.push({
    id: `exercise:${e.id}@v${RELEASE_VERSION}`,
    slug: e.id,
    en: e.en.slice(0, 160),
    fa: e.fa.slice(0, 160),
    movement,
    instructionsEn: `${e.en}: follow the in-app exercise guide for step-by-step form.`.slice(0, 1000),
    instructionsFa: e.steps.join(' ').slice(0, 1000),
    equipment: [...equipment].sort(),
  })
}

const lines = [
  '-- Generated by scripts/ops/generate-exercise-library-migration.mjs from the Android exercise',
  `-- library (version ${library.version}, ${rows.length} exercises). Do not edit by hand; regenerate.`,
  '-- Adds library exercises to the active v2 catalog so plans can use them. Existing ids are left',
  '-- untouched: saved plans and workout logs keep pointing at the same rows.',
  '',
  'alter table public.exercise_catalog',
  '  drop constraint if exists exercise_catalog_movement_pattern_check;',
  'alter table public.exercise_catalog',
  '  add constraint exercise_catalog_movement_pattern_check check (movement_pattern in (',
  "    'squat', 'hinge', 'push', 'pull', 'carry', 'locomotion', 'mobility', 'core', 'other'",
  '  ));',
  '',
  'insert into public.equipment_catalog(id, catalog_release_id, slug, name_en, name_fa)',
  'values',
  Object.entries(NEW_EQUIPMENT).map(([slug, [en, fa]]) =>
    `  (${sql(`equipment:${slug}@v${RELEASE_VERSION}`)}, ${sql(RELEASE_ID)}, ${sql(slug)}, ${sql(en)}, ${sql(fa)})`
  ).join(',\n'),
  'on conflict (id) do nothing;',
  '',
  'create temporary table exercise_library_import (',
  '  id text primary key, slug text not null, name_en text not null, name_fa text not null,',
  '  movement_pattern text not null, instructions_en text not null, instructions_fa text not null,',
  '  equipment_slugs text[] not null',
  ');',
  '',
  'insert into exercise_library_import',
  'values',
  rows.map((row) =>
    `  (${sql(row.id)}, ${sql(row.slug)}, ${sql(row.en)}, ${sql(row.fa)}, ${sql(row.movement)},\n` +
    `    ${sql(row.instructionsEn)},\n    ${sql(row.instructionsFa)},\n` +
    `    array[${row.equipment.map(sql).join(', ')}]::text[])`
  ).join(',\n') + ';',
  '',
  'with inserted as (',
  '  insert into public.exercise_catalog(',
  '    id, catalog_release_id, slug, name_en, name_fa, movement_pattern,',
  '    instructions_en, instructions_fa, contraindication_tags',
  '  )',
  `  select id, ${sql(RELEASE_ID)}, slug, name_en, name_fa, movement_pattern,`,
  "    instructions_en, instructions_fa, '{}'::text[]",
  '  from exercise_library_import',
  `  where not exists (`,
  '    select 1 from public.exercise_catalog existing',
  `    where existing.id = exercise_library_import.id`,
  `       or (existing.catalog_release_id = ${sql(RELEASE_ID)} and existing.slug = exercise_library_import.slug)`,
  '  )',
  '  returning id',
  ')',
  'insert into public.exercise_equipment(exercise_id, equipment_id, required)',
  `select item.id, 'equipment:' || equipment_slug || '@v${RELEASE_VERSION}', true`,
  'from exercise_library_import item',
  'join inserted on inserted.id = item.id',
  'cross join lateral unnest(item.equipment_slugs) as equipment_slug;',
  '',
  'drop table exercise_library_import;',
  '',
]

writeFileSync(outPath, lines.join('\n'), 'utf8')
console.log(`Wrote ${rows.length} exercises to ${outPath}`)
