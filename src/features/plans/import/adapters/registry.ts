import { jsonPlanAdapter } from './json-plan-adapter'
import type { PlanImportAdapter } from './types'

const adapters: PlanImportAdapter[] = [jsonPlanAdapter]

export function getPlanImportAdapter(file: File) {
  return adapters.find((adapter) => adapter.canRead(file))
}

export function getSupportedPlanExtensions() {
  return adapters.flatMap((adapter) => adapter.supportedExtensions)
}
