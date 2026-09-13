import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ExternalPlanImportPage } from './ExternalPlanImportPage'

vi.mock('../../external-plan/external-plan', () => ({
  loadExternalPlanContext: vi.fn(async () => ({})),
  buildExternalPlanPrompt: vi.fn(() => 'Synthetic prompt'),
  importExternalPlan: vi.fn(),
}))

async function setup() {
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><ExternalPlanImportPage locale="en" /></QueryClientProvider>)
  return await screen.findByLabelText('Choose JSON file')
}

const planFile = (name: string, text: () => Promise<string>) => ({ name, type: 'application/json', size: 100, text })
const contents = (name: string) => JSON.stringify({ plan_name: name, content_locale: 'en-US', days: [] })

describe('external plan file selection', () => {
  it('removes the previous importable preview when the replacement is invalid', async () => {
    const input = await setup()
    fireEvent.change(input, { target: { files: [planFile('plan.json', async () => contents('First plan'))] } })
    expect(await screen.findByText('First plan')).toBeInTheDocument()
    fireEvent.change(input, { target: { files: [{ name: 'wrong.txt', type: 'text/plain', size: 10 }] } })
    expect(screen.queryByText('First plan')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Validate and import', hidden: true })).toBeDisabled()
  })

  it('keeps the newest file when an earlier file finishes reading later', async () => {
    const input = await setup()
    let finishFirst!: (value: string) => void
    fireEvent.change(input, { target: { files: [planFile('plan.json', () => new Promise(resolve => { finishFirst = resolve }))] } })
    fireEvent.change(input, { target: { files: [planFile('plan.json', async () => contents('Updated plan'))] } })
    expect(await screen.findByText('Updated plan')).toBeInTheDocument()
    await act(async () => finishFirst(contents('Old plan')))
    expect(screen.getByText('Updated plan')).toBeInTheDocument()
    expect(screen.queryByText('Old plan')).not.toBeInTheDocument()
  })
})
