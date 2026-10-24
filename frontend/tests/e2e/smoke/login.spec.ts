import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';

const verifiedUser = {
  id: 'supabase-test-user',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'operator@example.test',
  email_confirmed_at: '2026-10-22T08:00:00Z',
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: {},
  identities: [],
  created_at: '2026-10-22T08:00:00Z',
  updated_at: '2026-10-22T08:00:00Z',
};

async function stubSupabaseOtp(page: import('@playwright/test').Page) {
  await page.route('**/auth/v1/otp', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ message_id: 'test-message' }),
  }));
  await page.route('**/auth/v1/verify', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      access_token: 'supabase-access-token',
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      refresh_token: 'test-refresh-token',
      user: verifiedUser,
    }),
  }));
}

test.describe('Login with email OTP', () => {
  test('login page loads with email input and no password field', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.expectPageLoaded();
    await expect(page.getByLabel('Password')).toHaveCount(0);
    await expect(page.getByLabel('Role Portal')).toHaveCount(0);
  });

  test('requests a code and exchanges verified Supabase identity for the role-aware app session', async ({ page }) => {
    await stubSupabaseOtp(page);
    await page.route('**/api/**', (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '[]',
    }));
    await page.route('**/api/auth/supabase/login', async (route) => {
      expect(route.request().headers().authorization).toBe('Bearer supabase-access-token');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 300,
          username: 'operator',
          token: 'project-session-token',
          roles: ['AMBULANCE_OPERATOR'],
        }),
      });
    });

    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.requestCode('operator@example.test');
    await expect(page.getByRole('status')).toContainText('A one-time code was sent');
    await loginPage.verifyCode('123456');

    await expect(page).toHaveURL(/\/ambulance(?:$|\/)/);
    await expect(page.getByRole('navigation').getByText('Emergency Operations')).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('token'))).toBe('project-session-token');
  });

  test('shows an actionable message when the OTP provider is unavailable', async ({ page }) => {
    await page.route('**/auth/v1/otp', (route) => route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Email delivery is unavailable.' }),
    }));
    await page.goto('/login');
    await page.getByLabel('Email Address').fill('patient@example.test');
    await page.getByRole('button', { name: 'Send Sign-In Code' }).click();
    await expect(page.locator('div[role="alert"].p-3')).toContainText('Email delivery is unavailable');
  });

  test('register link navigates to registration', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.registerLink.click();
    await expect(page).toHaveURL(/register/);
  });
});
