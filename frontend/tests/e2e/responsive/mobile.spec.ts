import { test, expect } from '../../fixtures/auth';

test.describe('Mobile Viewport Responsiveness (375x812)', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('patient layout adapts to mobile screen', async ({ patientPage }) => {
    await patientPage.goto('/patient');
    await expect(patientPage).toHaveURL(/\/patient/);

    // Mobile menu toggle button should be visible
    const toggleBtn = patientPage.getByRole('button', { name: /toggle menu/i }).first();
    await expect(toggleBtn).toBeVisible();

    // Click toggle button to open mobile menu
    await toggleBtn.click();
    const menuContainer = patientPage.getByText(/patient navigation|menu/i).first();
    await expect(menuContainer).toBeVisible();
  });

  test('doctor layout adapts to mobile screen', async ({ doctorPage }) => {
    await doctorPage.goto('/doctor');
    await expect(doctorPage).toHaveURL(/\/doctor/);

    const toggleBtn = doctorPage.getByRole('button', { name: /toggle menu/i }).first();
    await expect(toggleBtn).toBeVisible();
  });
});
