import { test, expect } from '../../fixtures/auth';
import { AmbulanceDashboardPage } from '../../pages/AmbulanceDashboardPage';

/**
 * Ambulance Operator Dashboard — Smoke Tests
 * These tests verify the dashboard renders correctly regardless of backend state.
 */

test.describe('Ambulance Dashboard — Smoke', () => {

  test('ambulance layout loads sidebar and top header', async ({ ambulancePage }) => {
    const dashboard = new AmbulanceDashboardPage(ambulancePage);
    await dashboard.goto();
    await expect(ambulancePage).toHaveURL('/ambulance');

    // Top header should have Emergency Operations branding
    await expect(ambulancePage.getByText('Emergency Operations').first()).toBeVisible();
  });

  test('ambulance dashboard renders main heading', async ({ ambulancePage }) => {
    const dashboard = new AmbulanceDashboardPage(ambulancePage);
    await dashboard.goto();

    // Greeting heading
    await expect(ambulancePage.locator('#ambulance-dashboard-heading')).toBeVisible();
  });

  test('ambulance dashboard has Active Assignment card', async ({ ambulancePage }) => {
    const dashboard = new AmbulanceDashboardPage(ambulancePage);
    await dashboard.goto();

    await expect(ambulancePage.getByText('Active Assignment')).toBeVisible();
  });

  test('ambulance dashboard has Ambulance Status card', async ({ ambulancePage }) => {
    const dashboard = new AmbulanceDashboardPage(ambulancePage);
    await dashboard.goto();

    await expect(ambulancePage.getByText('Ambulance Status')).toBeVisible();
  });

  test('navigate to Active Emergency page', async ({ ambulancePage }) => {
    await ambulancePage.goto('/ambulance/emergency');
    await expect(ambulancePage).toHaveURL('/ambulance/emergency');

    // Wait for Next.js client component state to resolve beyond loading spinner
    await ambulancePage.waitForFunction(() => {
      const txt = document.body.innerText;
      return txt.includes('Active Emergency') || txt.includes('No Active Emergency') || txt.includes('could not be loaded');
    }, { timeout: 10000 });
  });

  test('navigate to History page', async ({ ambulancePage }) => {
    await ambulancePage.goto('/ambulance/history');
    await expect(ambulancePage).toHaveURL('/ambulance/history');
    await expect(ambulancePage.getByText('Emergency History').first()).toBeVisible();
  });

  test('navigate to Operator Profile page', async ({ ambulancePage }) => {
    await ambulancePage.goto('/ambulance/profile');
    await expect(ambulancePage).toHaveURL('/ambulance/profile');
    await expect(ambulancePage.getByText('Operator Profile').first()).toBeVisible();
  });

  test('/ambulance/dashboard redirects to /ambulance', async ({ ambulancePage }) => {
    await ambulancePage.goto('/ambulance/dashboard');
    await expect(ambulancePage).toHaveURL('/ambulance');
  });

});
