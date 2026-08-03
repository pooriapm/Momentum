import { optionalEnv } from './config.ts'
import { HttpError } from './http.ts'

function enabled(name: string): boolean {
  return optionalEnv(name)?.toLowerCase() === 'true'
}

export function assertAiFeatureEnabled(featureFlag: string): void {
  if (!enabled('AI_MASTER_ENABLED') || !enabled(featureFlag)) {
    throw new HttpError(
      503,
      'ai_temporarily_disabled',
      'This AI feature is temporarily unavailable.',
    )
  }
}
