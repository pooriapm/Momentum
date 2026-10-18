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

function parseInserts(sql: string): Map<string, Record<string, SqlValue>[]> {
  const tables = new Map<string, Record<string, SqlValue>[]>()
  const pattern = /insert into public\.(\w+)\s*\(([^)]*)\)\s*values\s*/gi
  for (const match of sql.matchAll(pattern)) {
    const table = match[1] as string
    const columns = (match[2] as string).split(',').map((column) => column.trim())
    const rows = tables.get(table) ?? []
    let index = (match.index ?? 0) + match[0].length
    for (;;) {
      while (/\s/.test(sql[index] ?? '')) index += 1
      if (sql[index] !== '(') break
      index += 1
      const row: Record<string, SqlValue> = {}
      for (const column of columns) {
        const [value, next] = parseValue(sql, index)
        row[column] = value
        index = next
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
