import { afterEach, describe, expect, it, vi } from 'vitest'
import worker, { OPS_ALLOWED_ERROR_CODES } from '../workers/ops'

const assets = {
  fetch: vi.fn(async () => new Response('spa', { status: 200 })),
}

function request(path: string, init?: RequestInit) {
  return new Request(`https://momentum.pooria-pm.workers.dev${path}`, init)
}

function env() {
  return { ASSETS: assets }
}

describe('ops worker', () => {
  afterEach(() => {
    assets.fetch.mockClear()
  })

  it('serves categorical health without secrets', async () => {
    const response = await worker.fetch(request('/ops/health'), env())
    expect(response.status).toBe(200)
    const body = await response.json() as { service: string; status: string; ops: Record<string, boolean> }
    expect(body).toEqual({
      service: 'momentum',
      status: 'ok',
      ops: { health: true, error_ingest: true },
    })
    expect(JSON.stringify(body)).not.toMatch(/service_role|token|password|email/i)
    expect(assets.fetch).not.toHaveBeenCalled()
  })

  it('accepts allowlisted client errors and drops extra fields', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const accepted = await worker.fetch(request('/ops/client-errors', {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: JSON.stringify({
        event: 'fatal_render',
        code: 'fatal_render',
        message: 'fatal_render',
        stack: '    at /src/app/App.tsx',
        href: 'https://momentum.pooria-pm.workers.dev/en/app',
        env: 'production',
        release: '0.4.0',
        request_id: '11111111-1111-4111-8111-111111111111',
      }),
    }), env())
    expect(accepted.status).toBe(204)

    const rejected = await worker.fetch(request('/ops/client-errors', {
      method: 'POST',
      body: JSON.stringify({
        event: 'fatal_render',
        code: 'fatal_render',
        message: 'fatal_render',
        email: 'ava@example.com',
        prompt: 'generate a meal plan',
      }),
    }), env())
    expect(rejected.status).toBe(400)
    await expect(rejected.json()).resolves.toEqual({ code: 'unknown_fields' })
    expect(log.mock.calls.join(' ')).not.toContain('ava@example.com')
    log.mockRestore()
  })

  it('scrubs query strings and secrets from href and stack before logging', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const accepted = await worker.fetch(request('/ops/client-errors', {
      method: 'POST',
      body: JSON.stringify({
        event: 'unhandled_error',
        code: 'unhandled_error',
        message: 'unhandled_error',
        href: 'https://momentum.pooria-pm.workers.dev/en/app?access_token=secret-token#frag',
        stack: 'Error at App\nAuthorization: Bearer abc.def.ghi\nuser=ava@example.com',
      }),
    }), env())
    expect(accepted.status).toBe(204)
    const logged = JSON.parse(String(log.mock.calls[0]?.[0] ?? '{}')) as { href: string; stack: string }
    expect(logged.href).toBe('https://momentum.pooria-pm.workers.dev/en/app')
    expect(logged.href).not.toContain('access_token')
    expect(logged.stack).not.toMatch(/Bearer abc|ava@example.com/i)
    expect(logged.stack).toContain('[redacted]')
    log.mockRestore()
  })

  it('rejects health text disguised as the error message', async () => {
    const response = await worker.fetch(request('/ops/client-errors', {
      method: 'POST',
      body: JSON.stringify({
        event: 'unhandled_error',
        code: 'unhandled_error',
        message: 'chest pain after dinner',
      }),
    }), env())
    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ code: 'unsafe_message' })
  })

  it('passes non-ops traffic to assets', async () => {
    const response = await worker.fetch(request('/en/app'), env())
    expect(await response.text()).toBe('spa')
    expect(assets.fetch).toHaveBeenCalledTimes(1)
  })

  it('keeps the worker allowlist aligned with the client', () => {
    expect([...OPS_ALLOWED_ERROR_CODES]).toEqual([
      'fatal_render',
      'unhandled_error',
      'unhandled_rejection',
      'auth_rate_limited',
    ])
  })
})
