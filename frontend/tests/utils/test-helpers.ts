import { Page } from '@playwright/test';

// ──────────────────────────────────────────────────────────────────────────────
// Auth Helpers
// ──────────────────────────────────────────────────────────────────────────────

export interface MockUser {
  id: number;
  username: string;
  roles: string[];
}

/**
 * Inject authentication directly into localStorage.
 * Uses the same keys as auth.tsx (token + user).
 * This is faster than going through the login form for every test.
 */
export async function setAuthStorage(
  page: Page,
  user: MockUser,
  token = 'e2e-test-token'
): Promise<void> {
  await page.addInitScript(
    ({ token, user }) => {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
    },
    { token, user }
  );
}

/**
 * Pre-built patient auth injection.
 */
export async function setPatientAuth(page: Page): Promise<void> {
  const username = process.env.E2E_PATIENT_USERNAME || 'e2e_patient';
  const id = parseInt(process.env.E2E_PATIENT_ID || '100', 10);
  await setAuthStorage(page, { id, username, roles: ['PATIENT'] }, process.env.E2E_PATIENT_TOKEN || 'e2e-test-token');
}

/**
 * Pre-built doctor auth injection.
 */
export async function setDoctorAuth(page: Page): Promise<void> {
  const username = process.env.E2E_DOCTOR_USERNAME || 'e2e_doctor';
  const id = parseInt(process.env.E2E_DOCTOR_ID || '1', 10);
  await setAuthStorage(page, { id, username, roles: ['DOCTOR'] }, process.env.E2E_DOCTOR_TOKEN || 'e2e-test-token');
}

/**
 * Pre-built pharmacy auth injection.
 */
export async function setPharmacyAuth(page: Page): Promise<void> {
  const username = process.env.E2E_PHARMACY_USERNAME || 'greenvalley_pharmacy';
  const id = parseInt(process.env.E2E_PHARMACY_ID || '1', 10);
  await setAuthStorage(page, { id, username, roles: ['PHARMACY'] });
}

/**
 * Pre-built ambulance operator auth injection.
 * Uses userId=300 to match the seed DataInitializer operator.
 */
export async function setAmbulanceOperatorAuth(page: Page): Promise<void> {
  const username = process.env.E2E_AMBULANCE_USERNAME || 'ramesh_operator';
  const id = parseInt(process.env.E2E_AMBULANCE_ID || '300', 10);
  await setAuthStorage(page, { id, username, roles: ['AMBULANCE_OPERATOR'] });
}

/**
 * Clear authentication from localStorage.
 */
export async function clearAuth(page: Page): Promise<void> {
  // localStorage is unavailable on Playwright's initial about:blank page.
  // Land on the configured local origin before clearing persisted auth state.
  if (!page.url().startsWith('http://') && !page.url().startsWith('https://')) {
    await page.goto('/');
  }
  await page.evaluate(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// Navigation Helpers
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Wait for the page to stabilise after navigation.
 */
export async function waitForPageLoad(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {
    // Fallback: just wait for DOM content
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// Console Error Monitoring
// ──────────────────────────────────────────────────────────────────────────────

const IGNORABLE_CONSOLE_PATTERNS = [
  // Next.js Turbopack development warnings (harmless)
  /Download the React DevTools/,
  /ReactDOM.render is no longer supported/,
  /Warning: Each child in a list should have a unique/,
  /Fast Refresh/,
  /[HMR]/,
  // Favicon 404 (not application code)
  /favicon/,
];

/**
 * Attach a console error listener to a page.
 * Returns an array that accumulates error messages.
 * The caller decides whether to fail the test.
 */
export function attachConsoleErrorListener(page: Page): string[] {
  const errors: string[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      const isIgnorable = IGNORABLE_CONSOLE_PATTERNS.some((p) => p.test(text));
      if (!isIgnorable) {
        errors.push(text);
      }
    }
  });

  return errors;
}

// ──────────────────────────────────────────────────────────────────────────────
// Network Interception Helpers
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Simulate a 500 error from a given API path.
 * Used for error-state tests only.
 */
export async function mockApiError(
  page: Page,
  urlPattern: string | RegExp,
  status = 500
): Promise<void> {
  await page.route(urlPattern, (route) => {
    route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Simulated API error', status }),
    });
  });
}

/**
 * Simulate a network timeout for a given API path.
 */
export async function mockApiTimeout(
  page: Page,
  urlPattern: string | RegExp
): Promise<void> {
  await page.route(urlPattern, (route) => {
    route.abort('timedout');
  });
}
