import fs from 'node:fs'
import path from 'node:path'
import type { PlanCatalogRows } from '../../supabase/functions/_shared/plan-catalog.ts'

// Loads the real momentum-core@v2 catalog from its migration so tests exercise
// the same rows production serves, not a hand-written approximation.
const MIGRATION = path.resolve(
  import.meta.dirname,
  '../../supabase/migrations/202608180100_momentum_core_catalog_v2.sql',
)

type SqlValue = string | number | boolean | null | SqlValue[]

function parseValue(sql: string, start: number): [SqlValue, number] {
  let index = start
  while (/\s/.test(sql[index] ?? '')) index += 1
  if (sql[index] === "'") {
    let text = ''
    index += 1
    for (;;) {
      const char = sql[index]
      if (char === undefined) throw new Error('Unterminated SQL string')
      if (char === "'") {
        if (sql[index + 1] === "'") {
          text += "'"
          index += 2
          continue
        }
        return [text, index + 1]
      }
      text += char
      index += 1
    }
  }
  if (sql.startsWith('array[', index)) {
    const items: SqlValue[] = []
    index += 'array['.length
    for (;;) {
      while (/\s/.test(sql[index] ?? '')) index += 1
      if (sql[index] === ']') return [items, index + 1]
      const [item, next] = parseValue(sql, index)
      items.push(item)
      index = next
      while (/\s/.test(sql[index] ?? '')) index += 1
      if (sql[index] === ',') index += 1
    }
  }
  const match = /^[^,)\]]+/.exec(sql.slice(index))
  if (!match) throw new Error(`Unexpected SQL at ${index}`)
  const raw = match[0].trim()
  const value = raw === 'true' ? true
    : raw === 'false' ? false
    : raw === 'null' ? null
    : /^-?\d+(\.\d+)?$/.test(raw) ? Number(raw)
    : raw
  return [value, index + match[0].length]
}

function parseInserts(
  sql: string,
  knownColumns: Record<string, string[]> = {},
): Map<string, Record<string, SqlValue>[]> {
  const tables = new Map<string, Record<string, SqlValue>[]>()
  const pattern = /insert into (?:public\.)?(\w+)\s*(?:\(([^)]*)\))?\s*values\s*/gi
  for (const match of sql.matchAll(pattern)) {
    const table = match[1] as string
    const columns = match[2]
      ? match[2].split(',').map((column) => column.trim())
      : knownColumns[table]
    if (!columns) continue
    const rows = tables.get(table) ?? []
    let index = (match.index ?? 0) + match[0].length
    for (;;) {
      while (/\s/.test(sql[index] ?? '')) index += 1
      if (sql[index] !== '(') break
      index += 1
      const row: Record<string, SqlValue> = {}
      for (const column of columns) {
        const [value, next] = parseValue(sql, index)
        // Skip a ::type cast after the value (e.g. array[...]::text[]).
        let after = next
        while (sql.startsWith('::', after)) after = after + (/^::[a-z_]+(\[\])?/i.exec(sql.slice(after))?.[0].length ?? 2)
        row[column] = value
        index = after
        while (/\s/.test(sql[index] ?? '')) index += 1
        if (sql[index] === ',') index += 1
      }
      while (sql[index] !== ')') index += 1
      index += 1
      rows.push(row)
      while (/\s/.test(sql[index] ?? '')) index += 1
      if (sql[index] === ',') index += 1
      else break
    }
    tables.set(table, rows)
  }
  return tables
}

export function coreCatalogV2Rows(): PlanCatalogRows {
  const tables = parseInserts(fs.readFileSync(MIGRATION, 'utf8'))
  const table = (name: string) => tables.get(name) ?? []
  return {
    releases: table('catalog_releases').map(({ id }) => ({ id })),
    allergens: table('allergen_catalog'),
    ingredients: table('ingredient_catalog'),
    ingredientAllergens: table('ingredient_allergens'),
    foods: table('food_catalog'),
    foodIngredients: table('food_catalog_ingredients'),
    equipment: table('equipment_catalog'),
    exercises: table('exercise_catalog'),
    exerciseEquipment: table('exercise_equipment'),
    substitutions: table('exercise_substitutions'),
  }
}

const LIBRARY_MIGRATION = path.resolve(
  import.meta.dirname,
  '../../supabase/migrations/202610190101_exercise_library_catalog.sql',
)

/** The v2 catalog plus every exercise the 316-exercise library migration adds. */
export function coreCatalogWithLibraryRows(): PlanCatalogRows {
  const base = coreCatalogV2Rows()
  const tables = parseInserts(fs.readFileSync(LIBRARY_MIGRATION, 'utf8'), {
    exercise_library_import: [
      'id', 'slug', 'name_en', 'name_fa', 'movement_pattern', 'instructions_en',
      'instructions_fa', 'equipment_slugs',
    ],
  })
  const known = new Set(base.exercises.map((row) => String(row.id)))
  const knownSlugs = new Set(base.exercises.map((row) => String(row.slug)))
  const added = (tables.get('exercise_library_import') ?? [])
    .filter((row) => !known.has(String(row.id)) && !knownSlugs.has(String(row.slug)))
  const equipment = [
    ...base.equipment,
    ...(tables.get('equipment_catalog') ?? []).filter((row) =>
      !base.equipment.some((existing) => existing.id === row.id)
    ),
  ]
  return {
    ...base,
    equipment,
    exercises: [
      ...base.exercises,
      ...added.map(({ id, name_en, name_fa, movement_pattern }) => ({ id, name_en, name_fa, movement_pattern })),
    ],
    exerciseEquipment: [
      ...base.exerciseEquipment,
      ...added.flatMap((row) =>
        (row.equipment_slugs as string[]).map((slug) => ({
          exercise_id: row.id,
          equipment_id: `equipment:${slug}@v2`,
        }))
      ),
    ],
  }
}
