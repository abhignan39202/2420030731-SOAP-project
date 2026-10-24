import { test, expect } from '../../fixtures/auth';

test.describe('Session Persistence Tests', () => {
  test('session persists after page refresh', async ({ patientPage }) => {
    await patientPage.goto('/patient/consultations');
    await expect(patientPage).toHaveURL(/\/patient\/consultations/);

    // Refresh page
    await patientPage.reload();
    await expect(patientPage).toHaveURL(/\/patient\/consultations/);

    const token = await patientPage.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeTruthy();
  });
});
