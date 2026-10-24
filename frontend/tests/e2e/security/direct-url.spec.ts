import { test, expect } from '@playwright/test';
import { clearAuth } from '../../utils/test-helpers';

test.describe('Direct URL Access Tests', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuth(page);
  });

  test('direct navigation to /patient redirects unauthenticated users', async ({ page }) => {
    await page.goto('/patient');
    await expect(page).toHaveURL(/\/login/);
  });

  test('direct navigation to /doctor redirects unauthenticated users', async ({ page }) => {
    await page.goto('/doctor');
    await expect(page).toHaveURL(/\/login/);
  });

  test('direct navigation to /patient/emergency redirects unauthenticated users', async ({ page }) => {
    await page.goto('/patient/emergency');
    await expect(page).toHaveURL(/\/login/);
  });
});
