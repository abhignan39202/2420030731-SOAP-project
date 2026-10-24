import { test, expect } from '../../fixtures/auth';

/**
 * Requires a running Gateway, a patient token, and a finalized prescription
 * with at least one PENDING dose for that patient. No healthcare API is mocked.
 */
test.describe('Medication adherence persistence', () => {
  test.skip(!process.env.E2E_BACKEND, 'Requires the real Gateway, MySQL, and seeded finalized prescription.');

  test('patient marks a scheduled dose taken and sees it in persisted history', async ({ patientPage }) => {
    await patientPage.goto('/patient/medicines');
    await expect(patientPage.getByRole('heading', { name: /daily medicine reminders/i })).toBeVisible();

    const markTaken = patientPage.getByRole('button', { name: /mark taken/i }).first();
    await expect(markTaken).toBeVisible();
    await markTaken.click();

    await expect(patientPage.getByText(/medication marked TAKEN/i)).toBeVisible();
    await patientPage.getByRole('button', { name: /adherence history/i }).click();
    await expect(patientPage.getByText('TAKEN', { exact: true }).last()).toBeVisible();
  });
});
