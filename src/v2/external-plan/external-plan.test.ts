import { describe, expect, it } from 'vitest'
import { buildExternalPlanPrompt, type ExternalPlanContext } from './external-plan'

const context: ExternalPlanContext = {
  schema_version: '1.0.0',
  requested_days: 7,
  output_schema: { type: 'object', required: ['days'] },
  catalog: { release_id: 'momentum-core@v2', foods: [{ id: 'food:rice@v2' }] },
  declared_allergen_ids: ['allergen:peanut@v2'],
  profile: { locale: 'en-US', display_name: 'Sara' },
  goal: { goal_type: 'maintenance' },
  dietary: { allergies: ['peanut'] },
  health: null,
  training: [],
}

describe('external plan prompt', () => {
  it('is provider-neutral and embeds the versioned contract, catalog, and safety context', () => {
    const prompt = buildExternalPlanPrompt(context)
    expect(prompt).toContain('schema version 1.0.0')
    expect(prompt).toContain('momentum-core@v2')
    expect(prompt).toContain('allergen:peanut@v2')
    expect(prompt).toContain('Return exactly one raw JSON object')
    expect(prompt).not.toMatch(/chatgpt|openai|claude|gemini/i)
  })
})
