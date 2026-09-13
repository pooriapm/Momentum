import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.resetModules() })

describe('connectivity probes', () => {
  it('recovers a transient probe failure without blocking writes', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new TypeError('network')).mockResolvedValueOnce({ ok: true }))
    const network = await import('./network')
    await network.probeConnectivity()
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(() => network.assertOnline()).not.toThrow()
  })

  it('blocks writes after confirmed failure and unlocks after recovery', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('network'))
    vi.stubGlobal('fetch', fetchMock)
    const network = await import('./network')
    await network.probeConnectivity()
    expect(() => network.assertOnline()).toThrow('offline_mutation_blocked')
    fetchMock.mockResolvedValue({ ok: true })
    await network.probeConnectivity()
    expect(() => network.assertOnline()).not.toThrow()
  })

  it('does not let a late successful probe override a browser disconnection', async () => {
    let finish!: (response: { ok: boolean }) => void
    vi.stubGlobal('fetch', vi.fn(() => new Promise(resolve => { finish = resolve })))
    const network = await import('./network')
    const probe = network.probeConnectivity()
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    finish({ ok: true })
    await probe
    expect(() => network.assertOnline()).toThrow('offline_mutation_blocked')
  })
})
