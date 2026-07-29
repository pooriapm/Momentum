import {
  PlanImportAdapterError,
  type PlanImportAdapter,
} from './types'

export const jsonPlanAdapter: PlanImportAdapter = {
  id: 'momentum-json',
  supportedExtensions: ['.json'],
  canRead: (file) => file.name.toLowerCase().endsWith('.json'),
  async parse(file) {
    try {
      return JSON.parse(await file.text()) as unknown
    } catch {
      throw new PlanImportAdapterError('محتوای فایل JSON معتبر نیست.')
    }
  },
}
