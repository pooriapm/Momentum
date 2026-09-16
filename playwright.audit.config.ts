import { defineConfig } from '@playwright/test'
import { existsSync } from 'node:fs'

const configuredChrome = process.env.PLAYWRIGHT_CHROME_PATH
const macChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const executablePath = configuredChrome && existsSync(configuredChrome)
  ? configuredChrome
  : existsSync(macChrome) ? macChrome : undefined

export default defineConfig({
  testDir: './e2e',
  testMatch: 'pre-llm-onboarding.spec.ts',
  fullyParallel: false,
  reporter: 'list',
  timeout: 45_000,
  use: {
    baseURL: 'http://127.0.0.1:4174',
    launchOptions: executablePath ? { executablePath } : undefined,
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'audit-chrome', use: { browserName: 'chromium' } }],
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4174',
    url: 'http://127.0.0.1:4174',
    env: {
      VITE_SUPABASE_URL: 'https://mock.test',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'audit-public-key',
    },
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
