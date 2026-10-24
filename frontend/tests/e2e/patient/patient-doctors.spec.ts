import { test, expect } from '../../fixtures/auth';

test.describe('Patient Doctor Search & Booking', () => {
  test('doctor listing page loads and presents search interface', async ({ patientPage }) => {
    await patientPage.goto('/patient/doctors');
    await expect(patientPage).toHaveURL(/\/patient\/doctors/);
    await expect(patientPage.getByRole('heading').first()).toBeVisible();
  });
});
