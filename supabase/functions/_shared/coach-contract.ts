import { HttpError } from './http.ts'

export interface CoachOutput {
  reply: string
  follow_up_question: string | null
  safety: {
    level: 'normal' | 'caution' | 'urgent'
    reason: string | null
  }
  suggested_actions: string[]
}

export const coachOutputJsonSchema: Record<string, unknown> = {
  type: 'object',
  properties: {
    reply: { type: 'string', minLength: 1, maxLength: 4000 },
    follow_up_question: { type: ['string', 'null'], maxLength: 500 },
    safety: {
      type: 'object',
      properties: {
        level: { type: 'string', enum: ['normal', 'caution', 'urgent'] },
        reason: { type: ['string', 'null'], maxLength: 500 },
      },
      required: ['level', 'reason'],
      additionalProperties: false,
    },
    suggested_actions: {
      type: 'array',
      maxItems: 4,
      items: { type: 'string', minLength: 1, maxLength: 300 },
    },
  },
  required: ['reply', 'follow_up_question', 'safety', 'suggested_actions'],
  additionalProperties: false,
}

export function assertCoachOutput(value: unknown): asserts value is CoachOutput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new HttpError(502, 'invalid_coach_output', 'Coach output is invalid.')
  }
  const output = value as Partial<CoachOutput>
  if (
    typeof output.reply !== 'string' ||
    output.reply.length < 1 ||
    output.reply.length > 4000 ||
    !output.safety ||
    !['normal', 'caution', 'urgent'].includes(output.safety.level) ||
    !Array.isArray(output.suggested_actions)
  ) {
    throw new HttpError(502, 'invalid_coach_output', 'Coach output is invalid.')
  }
}
