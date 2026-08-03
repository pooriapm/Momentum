import { describe, expect, it } from 'vitest'
import {
  bodyCompositionAnalysisSchema,
  coachEdgeResponseSchema,
  generationResponseSchema,
} from './contracts'

describe('Edge Function replay contracts', () => {
  it('accepts a plan-generation replay while the original request is running', () => {
    expect(generationResponseSchema.parse({
      job: { status: 'in_progress' },
      idempotent_replay: true,
    })).toEqual({ job: { status: 'in_progress' }, idempotent_replay: true })
  })

  it('accepts a coach replay while the original request is running', () => {
    expect(coachEdgeResponseSchema.parse({
      status: 'in_progress',
      idempotent_replay: true,
    })).toEqual({ status: 'in_progress', idempotent_replay: true })
  })

  it('requires body extraction values to carry confidence and evidence metadata', () => {
    const parsed = bodyCompositionAnalysisSchema.parse({
      measurement: {
        id: '10000000-0000-4000-8000-000000000001',
        extraction_status: 'needs_confirmation',
        extraction_result: {
          measurements: {
            weight: { value: 72.4, unit: 'kg', confidence: 0.98, evidence: 'Weight 72.4 kg' },
          },
        },
      },
    })
    expect('measurement' in parsed && parsed.measurement.extraction_result.measurements.weight?.value).toBe(72.4)
  })
})
