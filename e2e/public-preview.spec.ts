import { expect, test } from '@playwright/test'

const PREVIEW_READY_TIMEOUT_MS = 15_000

test('public shell and Persian in-memory preview remain usable', async ({ page }) => {
  await page.goto('/fa')
  await expect(page.getByRole('heading', { name: /هر روز، Momentum می‌داند/ })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')

  await page.goto('/fa/app/today?preview=1')
  await expect(page.getByRole('heading', { name: 'صبح بخیر، آوا' })).toBeVisible()
  await expect(page.getByText(/Preview حافظه‌ای/)).toBeVisible()
  await expect.poll(() => page.evaluate(() => localStorage.getItem('momentum.appState'))).toBeNull()
})

test('English public routes remain LTR and expose safety restrictions', async ({ page }) => {
  await page.goto('/en')
  await expect(page.getByRole('heading', { name: /Momentum always knows/ })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr')

  await page.goto('/en/safety')
  await expect(page.getByRole('main')).toBeVisible()
  await expect(page.getByText(/general wellness/i).first()).toBeVisible()
})

test('mobile tab navigation returns to the top with the shared motion language', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 780 })
  await page.goto('/en/app/today?preview=1')
  const workspace = page.locator('.app-workspace')
  await expect(page.locator('.today-page')).toBeVisible({ timeout: PREVIEW_READY_TIMEOUT_MS })
  await expect(page.getByRole('heading', { name: /good morning, ava/i })).toBeVisible()
  await workspace.evaluate((node) => { node.scrollTop = node.scrollHeight })
  await expect.poll(() => workspace.evaluate((node) => node.scrollTop)).toBeGreaterThan(0)

  const navigation = page.getByRole('navigation', { name: 'Primary navigation' })
  await navigation.getByRole('link', { exact: true, name: 'Plan' }).click()
  await expect(page.getByRole('heading', { name: /this week’s plan/i })).toBeVisible()
  await expect.poll(() => workspace.evaluate((node) => node.scrollTop)).toBe(0)
  await expect(page.locator('.plan-page')).toHaveCSS('animation-name', 'orbit-page-enter')
  await expect(page.getByRole('tabpanel')).toHaveCSS('animation-name', 'orbit-component-enter')

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await workspace.evaluate((node) => { node.scrollTop = node.scrollHeight })
  await navigation.getByRole('link', { exact: true, name: 'Progress' }).click()
  await expect(page.getByRole('heading', { name: /the trend you are building/i })).toBeVisible()
  expect(await workspace.evaluate((node) => node.scrollTop)).toBe(0)
})

test('public page navigation also returns the browser viewport to the top', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 780 })
  await page.goto('/en')
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0)

  await page.locator('.public-footer').getByRole('link', { name: 'Pricing' }).click()
  await expect(page.getByRole('heading', { name: /one subscription, one clear path/i })).toBeVisible()
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
  await expect(page.locator('.pricing-page')).toHaveCSS('animation-name', 'orbit-page-enter')
})
