import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AppErrorBoundary } from './AppErrorBoundary'
import { buildSafeErrorReport } from '../platform/observability/safe-error-report'

function parseReports(spy: ReturnType<typeof vi.spyOn>): Record<string, unknown>[] {
  const reports: Record<string, unknown>[] = []
  for (const call of spy.mock.calls) {
    for (const arg of call) {
      if (typeof arg !== 'string' || !arg.startsWith('{')) continue
      try {
        const parsed = JSON.parse(arg) as Record<string, unknown>
        if (typeof parsed.event === 'string' && typeof parsed.code === 'string') reports.push(parsed)
      } catch {
        // React also logs the original Error object to console.error.
      }
    }
  }
  return reports
}

function Boom({ error }: { error: Error }): ReactNode {
  throw error
}

describe('AppErrorBoundary', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    document.documentElement.lang = 'en'
  })

  it('keeps the existing fallback copy and hides error details', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    document.documentElement.lang = 'en'
    render(
      <AppErrorBoundary>
        <Boom error={new Error('user ava@x.com failed')} />
      </AppErrorBoundary>,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('This page did not load completely')
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Your account data has not changed. Reload the page to try again.',
    )
    expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument()
    expect(screen.queryByText(/ava@x.com/)).not.toBeInTheDocument()
    expect(screen.queryByText(/failed/)).not.toBeInTheDocument()
  })

  it('reports a sanitized fatal_render payload without email, query strings, or health fields', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const error = Object.assign(new Error('user ava@x.com failed'), {
      weight_kg: 72.8,
      notes: 'chest pain after dinner',
      email: 'ava@x.com',
    })
    error.stack = [
      'Error: user ava@x.com failed',
      '    at https://momentum.pooria-pm.workers.dev/assets/app.js?email=ava@x.com&token=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0In0.signaturepartxx',
    ].join('\n')

    render(
      <AppErrorBoundary>
        <Boom error={error} />
      </AppErrorBoundary>,
    )

    const reports = parseReports(consoleSpy)
    expect(reports).toHaveLength(1)
    expect(reports[0]?.event).toBe('fatal_render')
    expect(reports[0]?.code).toBe('fatal_render')

    const serialized = JSON.stringify(reports[0])
    expect(serialized).not.toContain('ava@x.com')
    expect(serialized).not.toMatch(/\?/)
    expect(serialized).not.toContain('weight_kg')
    expect(serialized).not.toContain('72.8')
    expect(serialized).not.toContain('chest pain')
    expect(serialized).not.toContain('eyJhbGci')
  })

  it('builds the same redactions when the reporter is invoked directly', () => {
    const error = Object.assign(new Error('user ava@x.com failed'), {
      weight_kg: 72.8,
      notes: 'private health note',
    })
    error.stack = 'Error: user ava@x.com failed\n    at https://example.test/app.js?q=1#token=secret'

    const payload = buildSafeErrorReport({ code: 'fatal_render', error })
    const serialized = JSON.stringify(payload)
    expect(serialized).not.toContain('ava@x.com')
    expect(serialized).not.toMatch(/\?/)
    expect(serialized).not.toContain('weight_kg')
    expect(serialized).not.toContain('private health note')
  })
})
