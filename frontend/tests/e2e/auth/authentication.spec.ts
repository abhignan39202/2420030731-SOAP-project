import { test, expect, type Page } from '@playwright/test';
import { clearAuth } from '../../utils/test-helpers';

async function stubOtpProvider(page: Page) {
  await page.route('**/auth/v1/otp', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ message_id: 'registration-test-message' }),
  }));
  await page.route('**/auth/v1/verify', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      access_token: 'verified-supabase-token',
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      refresh_token: 'test-refresh-token',
      user: {
        id: 'registered-supabase-user',
        aud: 'authenticated',
        role: 'authenticated',
        email: 'new.patient@example.test',
        email_confirmed_at: '2026-10-22T08:00:00Z',
        app_metadata: { provider: 'email', providers: ['email'] },
        user_metadata: {},
        identities: [],
        created_at: '2026-10-22T08:00:00Z',
        updated_at: '2026-10-22T08:00:00Z',
      },
    }),
  }));
}

test.describe('Supabase OTP authentication', () => {
  test.beforeEach(async ({ page }) => clearAuth(page));

  test('registration verifies email and creates the backend account with the selected role', async ({ page }) => {
    await stubOtpProvider(page);
    await page.route('**/api/**', (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '[]',
    }));
    await page.route('**/api/auth/supabase/register', async (route) => {
      const request = route.request();
      expect(request.headers().authorization).toBe('Bearer verified-supabase-token');
      expect(request.postDataJSON()).toMatchObject({
        username: 'new-patient',
        roles: ['PATIENT'],
      });
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 42,
          username: 'new-patient',
          token: 'project-session-token',
          roles: ['PATIENT'],
        }),
      });
    });

    await page.goto('/register');
    await page.getByLabel('Username').fill('new-patient');
    await page.getByLabel('Email Address').fill('new.patient@example.test');
    await page.getByRole('button', { name: 'Send Verification Code' }).click();
    await expect(page.getByRole('status')).toContainText('A verification code was sent');
    await page.getByLabel('Email verification code').fill('654321');
    await page.getByRole('button', { name: 'Verify & Create Account' }).click();

    await expect(page).toHaveURL(/\/patient(?:$|\/)/);
    expect(await page.evaluate(() => localStorage.getItem('token'))).toBe('project-session-token');
  });

  test('registration shows backend rejection instead of claiming the account was created', async ({ page }) => {
    await stubOtpProvider(page);
    await page.route('**/api/auth/supabase/register', (route) => route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Email verification service is temporarily unavailable.' }),
    }));

    await page.goto('/register');
    await page.getByLabel('Username').fill('new-patient');
    await page.getByLabel('Email Address').fill('new.patient@example.test');
    await page.getByRole('button', { name: 'Send Verification Code' }).click();
    await page.getByLabel('Email verification code').fill('654321');
    await page.getByRole('button', { name: 'Verify & Create Account' }).click();

    await expect(page.locator('div[role="alert"].p-3')).toContainText('Email verification service is temporarily unavailable.');
    await expect(page).toHaveURL(/\/register/);
    await expect(page.getByText(/saved locally/i)).toHaveCount(0);
  });
});
