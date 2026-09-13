import { expect, test } from '@playwright/test'

test('navigation changes immediately from a scrolled workspace', async ({ page }) => {
  await page.goto('/en/app/today?preview=1')
  await expect(page.getByRole('button', { name: 'Daily check-in · optional', exact: true })).toHaveCount(1)
  await expect(page.locator('#boot-splash')).toHaveCount(0)
  const path = await page.evaluate(() => {
    const workspace = document.querySelector<HTMLElement>('.app-workspace')!
    workspace.scrollTop = 500
    const plan = document.querySelector<HTMLAnchorElement>('.app-bottom-nav a[href*="/app/plan"]')!
    plan.click()
    return location.pathname
  })
  expect(path).toBe('/en/app/plan')
  await expect(page.getByRole('tab', { name: 'Week', exact: true })).toBeVisible()
})

test('sheet drag returns, can be grabbed while settling, and flicks away', async ({ page }) => {
  await page.goto('/en/app/today?preview=1')
  const opener = page.getByRole('button', { name: 'Daily check-in · optional', exact: true })
  await opener.click()
  const sheet = page.getByRole('dialog')
  const handle = page.getByRole('button', { name: 'Close sheet', exact: true })
  await expect(sheet).toBeVisible()
  // The spring must settle before measuring its rest position.
  await expect.poll(() => sheet.evaluate((node) => Math.abs(new DOMMatrix(getComputedStyle(node).transform).m42))).toBeLessThan(1)
  let bounds = (await handle.boundingBox())!
  const x = bounds.x + bounds.width / 2
  let y = bounds.y + bounds.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x, y + 120, { steps: 10 })
  await page.waitForTimeout(160) // Release without momentum.
  await page.mouse.up()
  await page.waitForTimeout(30)
  bounds = (await handle.boundingBox())!
  y = bounds.y + bounds.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  // Aim the active pointer at the handle atomically: its position changes between
  // automation commands while the return spring is running.
  await handle.dispatchEvent('pointerdown', { pointerId: 1, isPrimary: true, button: 0, clientX: x, clientY: y })
  const grabbed = await sheet.evaluate((node) => new DOMMatrix(getComputedStyle(node).transform).m42)
  await page.mouse.move(x, y + 50, { steps: 3 })
  const moved = await sheet.evaluate((node) => new DOMMatrix(getComputedStyle(node).transform).m42)
  // WebKit rounds pointer coordinates while the spring retains subpixel position.
  expect(Math.abs((moved - grabbed) - 50)).toBeLessThan(1)
  await page.waitForTimeout(160)
  await page.mouse.up()
  await expect.poll(() => sheet.evaluate((node) => Math.abs(new DOMMatrix(getComputedStyle(node).transform).m42))).toBeLessThan(1)
  bounds = (await handle.boundingBox())!
  y = bounds.y + bounds.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x, y + 240, { steps: 4 })
  await page.mouse.up()
  await expect(sheet).toHaveCount(0)
  await expect(opener).toBeFocused()
  await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden')
})

test('Plan tabs stay in one row at enlarged text size in both languages', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  for (const locale of ['en', 'fa']) {
    await page.goto(`/${locale}/app/plan?preview=1`)
    await expect(page.getByRole('tab')).toHaveCount(5)
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%' })
    const layout = await page.getByRole('tab').evaluateAll((tabs) => tabs.map((tab) => tab.getBoundingClientRect().top))
    expect(new Set(layout).size).toBe(1)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390)
    const first = page.getByRole('tab').first()
    await first.focus()
    await page.keyboard.press(locale === 'fa' ? 'ArrowLeft' : 'ArrowRight')
    await expect(page.getByRole('tab').nth(1)).toBeFocused()
    await expect(page.getByRole('tab').nth(1)).toHaveAttribute('aria-selected', 'true')
  }
})

test('reduced motion and increased contrast keep sheets and navigation usable', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce', contrast: 'more' })
  await page.goto('/en/app/today?preview=1')
  await page.getByRole('button', { name: 'Daily check-in · optional', exact: true }).click()
  const sheet = page.getByRole('dialog')
  await expect(sheet).toHaveCSS('transform', 'none')
  await expect(sheet).toHaveCSS('backdrop-filter', 'none')
  await page.keyboard.press('Escape')
  await expect(sheet).toHaveCount(0)
})
