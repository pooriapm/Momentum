import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

for (const locale of ['fa', 'en'] as const) {
  test(`${locale} public and product preview pass automated WCAG 2.2 AA checks`, async ({ page }) => {
    test.setTimeout(120_000)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    for (const path of [
      `/${locale}`,
      `/${locale}/auth/sign-up`,
      `/${locale}/app/today?preview=1`,
      `/${locale}/app/plan?preview=1`,
      `/${locale}/app/progress?preview=1`,
      `/${locale}/app/me?preview=1`,
      `/${locale}/app/settings?preview=1`,
      `/${locale}/app/account?preview=1`,
    ]) {
      await page.goto(path)
      await expect(page.locator('main')).toBeVisible()
      await page.waitForTimeout(800)
      const result = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze()
      expect(result.violations, `${path}: ${result.violations.map((item) => item.id).join(', ')}`).toEqual([])
    }
  })
}

test('RTL/LTR, mixed text, keyboard focus, and compact reflow remain semantic', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 })
  await page.goto('/fa')
  await expect(page.locator('html')).toHaveAttribute('lang', 'fa')
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await expect(page.locator('bdi[dir="ltr"]', { hasText: 'Momentum' }).first()).toBeVisible()
  const menuButton = page.getByRole('button', { name: 'بازکردن منو' })
  await menuButton.focus()
  await expect(menuButton).toBeFocused()
  await expect(menuButton).toHaveCSS('outline-style', 'solid')
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true)

  await page.goto('/en/app/today?preview=1')
  await page.addStyleTag({ content: 'html { font-size: 200% !important; }' })
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true)
})

test('the production PWA stays read-only offline and caches no API or health payload', async ({ context, page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'One production service-worker proof is sufficient; layout coverage runs in every browser.')
  await page.goto('/en/app/today?preview=1')
  await expect(page.getByRole('heading', { name: /good morning, ava/i })).toBeVisible()
  await page.evaluate(async () => { await navigator.serviceWorker.ready })

  const cachedUrls = await page.evaluate(async () => {
    const urls: string[] = []
    for (const name of await caches.keys()) {
      for (const request of await (await caches.open(name)).keys()) urls.push(request.url)
    }
    return urls
  })
  expect(cachedUrls.some((value) => {
    const url = new URL(value)
    return url.pathname.startsWith('/rest/v1')
      || url.pathname.startsWith('/functions/v1')
      || url.hostname.endsWith('.supabase.co')
  })).toBe(false)

  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole('heading', { name: /good morning, ava/i })).toBeVisible()
  await expect(page.getByText(/no health data is queued on this device/i)).toBeVisible()
  await expect(page.getByRole('button', { name: /^complete$/i })).toBeDisabled()
  const storage = await page.evaluate(() => ({ ...localStorage, ...sessionStorage }))
  expect(Object.keys(storage)).not.toContain('momentum.progress.nextCycleNote')
  await context.setOffline(false)
})
