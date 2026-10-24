import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';

// Keep local integration credentials out of the repository while letting the
// documented Playwright command use the ignored, developer-specific env file.
if (existsSync('.env.test')) process.loadEnvFile('.env.test');

/**
 * Playwright Configuration for Rural Health Companion E2E Tests
 * Phase 17 — Automated Testing
 *
 * Two-tier approach:
 *   - Smoke tests: no backend required (UI + localStorage auth)
 *   - Integration tests: full backend stack required
 */
export default defineConfig({
  testDir: './tests',
  /* Maximum time one test can run */
  timeout: 45 * 1000,
  /* Max time expect() assertions wait */
  expect: {
    timeout: 8000,
  },
  /* Report failures — do not hide them */
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,

  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],

  use: {
    /* All tests use this base URL */
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',

    /* Optional system browser path for environments without Playwright's browser cache. */
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : {},

    /* Collect trace only on first retry */
    trace: 'on-first-retry',

    /* Screenshot only on failure */
    screenshot: 'only-on-failure',

    /* Video only on first retry */
    video: 'on-first-retry',

    /* Don't ignore HTTPS errors in test env */
    ignoreHTTPSErrors: true,
  },

  projects: [
    /* Primary: Chromium */
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    /* Firefox — optional, enable for full regression */
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },

    /* WebKit / Safari — optional */
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },

    /* Mobile Chrome viewport */
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
      testMatch: '**/responsive/**',
    },
  ],

  /* Start the Next.js dev server before running tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
