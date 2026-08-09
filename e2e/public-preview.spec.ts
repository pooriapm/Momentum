import { expect, test } from '@playwright/test'

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
