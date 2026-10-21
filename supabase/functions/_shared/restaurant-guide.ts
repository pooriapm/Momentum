// Defensive dashboard projection of a plan's restaurant guide. Stored plans
// were validated when written, but older or imported content may drift, so
// malformed items are skipped instead of failing the whole dashboard.

const MAX_GUIDES = 8
const MAX_INSTRUCTIONS = 8
const MAX_TITLE_LENGTH = 160
const MAX_INSTRUCTION_LENGTH = 300
const CONFIDENCE_LEVELS = ['low', 'medium', 'high']
const NUTRITION_SOURCES = [
  'model_estimate',
  'catalog_reference',
  'food_label',
  'verified_database',
  'user_provided',
]

export interface RestaurantGuideItem {
  title: string
  order_instructions: string[]
  estimated_nutrition: {
    calories: number
    protein_g: number
    carbs_g: number
    fat_g: number
    fiber_g?: number
    confidence?: string
    source?: string
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function cappedText(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (trimmed.length === 0) return null
  return Array.from(trimmed).slice(0, maxLength).join('')
}

function nonNegativeNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null
}

function projectEstimatedNutrition(
  value: unknown,
): RestaurantGuideItem['estimated_nutrition'] | null {
  if (!isRecord(value)) return null
  const calories = nonNegativeNumber(value.calories)
  const protein = nonNegativeNumber(value.protein_g)
  const carbs = nonNegativeNumber(value.carbs_g)
  const fat = nonNegativeNumber(value.fat_g)
  if (calories === null || protein === null || carbs === null || fat === null) return null
  const nutrition: RestaurantGuideItem['estimated_nutrition'] = {
    calories,
    protein_g: protein,
    carbs_g: carbs,
    fat_g: fat,
  }
  const fiber = nonNegativeNumber(value.fiber_g)
  if (fiber !== null) nutrition.fiber_g = fiber
  if (typeof value.confidence === 'string' && CONFIDENCE_LEVELS.includes(value.confidence)) {
    nutrition.confidence = value.confidence
  }
  if (typeof value.source === 'string' && NUTRITION_SOURCES.includes(value.source)) {
    nutrition.source = value.source
  }
  return nutrition
}

export function projectRestaurantGuide(value: unknown): RestaurantGuideItem[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item): RestaurantGuideItem[] => {
    if (!isRecord(item)) return []
    const title = cappedText(item.title, MAX_TITLE_LENGTH)
    if (!title || !Array.isArray(item.order_instructions)) return []
    const instructions = item.order_instructions
      .flatMap((entry) => {
        const text = cappedText(entry, MAX_INSTRUCTION_LENGTH)
        return text ? [text] : []
      })
      .slice(0, MAX_INSTRUCTIONS)
    if (instructions.length === 0) return []
    const nutrition = projectEstimatedNutrition(item.estimated_nutrition)
    if (!nutrition) return []
    return [{ title, order_instructions: instructions, estimated_nutrition: nutrition }]
  }).slice(0, MAX_GUIDES)
}
