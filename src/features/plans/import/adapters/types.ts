export interface PlanImportAdapter {
  id: string
  supportedExtensions: string[]
  canRead: (file: File) => boolean
  parse: (file: File) => Promise<unknown>
}

export class PlanImportAdapterError extends Error {
  readonly path: string

  constructor(
    message: string,
    path = 'file',
  ) {
    super(message)
    this.path = path
  }
}
