import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ExternalPlanImportPage } from './ExternalPlanImportPage'
import { importExternalPlan } from '../../external-plan/external-plan'
import { useOnlineStatus } from '../../../platform/pwa/network'

vi.mock('../../external-plan/external-plan', () => ({
  loadExternalPlanContext: vi.fn(async () => ({})),
  buildExternalPlanPrompt: vi.fn(() => 'Synthetic prompt'),
  importExternalPlan: vi.fn(),
}))

vi.mock('../../../platform/pwa/network', () => ({
  useOnlineStatus: vi.fn(() => true),
}))

const importPlan = vi.mocked(importExternalPlan)
const online = vi.mocked(useOnlineStatus)

async function setup() {
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><ExternalPlanImportPage locale="en" /></QueryClientProvider>)
  return await screen.findByLabelText('Choose JSON file')
}

const planFile = (name: string, text: () => Promise<string>) => ({ name, type: 'application/json', size: 100, text })
const contents = (name: string) => JSON.stringify({ plan_name: name, content_locale: 'en-US', days: [] })

describe('external plan file selection', () => {
  beforeEach(() => {
    online.mockReturnValue(true)
    importPlan.mockReset()
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockResolvedValue(undefined) } })
  })

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

  it('shows a recoverable message when clipboard access is denied and resets status with disclosure', async () => {
    await setup()
    vi.mocked(navigator.clipboard.writeText).mockRejectedValueOnce(new Error('denied'))
    const disclosure = screen.getByLabelText(/copying moves profile/i)
    fireEvent.click(disclosure)
    fireEvent.click(screen.getByText('Copy prompt').closest('button')!)
    expect(await screen.findByText(/allow clipboard access and try again/i)).toBeInTheDocument()
    fireEvent.click(disclosure)
    expect(screen.queryByText(/allow clipboard access and try again/i)).not.toBeInTheDocument()
  })

  it('uses a group for source choices and blocks importing while offline', async () => {
    online.mockReturnValue(false)
    const input = await setup()
    expect(document.querySelector('.external-plan-source')).toHaveAttribute('role', 'group')
    expect(document.querySelector('[role="radiogroup"]')).not.toBeInTheDocument()
    fireEvent.change(input, { target: { files: [planFile('plan.json', async () => contents('Offline plan'))] } })
    expect(await screen.findByText('Offline plan')).toBeInTheDocument()
    expect(screen.getByText('Validate and import').closest('button')).toBeDisabled()
    expect(importPlan).not.toHaveBeenCalled()
  })
})
