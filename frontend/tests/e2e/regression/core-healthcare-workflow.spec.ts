import { test, expect } from '../../fixtures/auth';

/**
 * Runs against the deployed API when E2E_BACKEND=true. The test deliberately
 * does not intercept healthcare endpoints: the appointment, symptoms,
 * consultation, and prescription records must come from the real services.
 */
test.describe('Core healthcare workflow', () => {
  test.skip(!process.env.E2E_BACKEND, 'Requires a running Gateway and seeded E2E users.');

  test('patient symptoms are visible to the assigned doctor and finalized prescription is visible to patient', async ({ patientPage, doctorPage }) => {
    await patientPage.goto('/patient/doctors');
    await expect(patientPage.getByRole('heading', { name: /find doctors/i })).toBeVisible();

    const doctorCard = patientPage.locator('button', { hasText: /book appointment/i }).first();
    await expect(doctorCard).toBeVisible();
    await doctorCard.click();
    const appointmentDate = new Date();
    appointmentDate.setDate(appointmentDate.getDate() + 1);
    await patientPage.locator('input[type="date"]').fill(appointmentDate.toISOString().slice(0, 10));
    const slot = patientPage.locator('select').filter({ has: patientPage.locator('option') }).last();
    await expect(slot).toBeVisible();
    await expect(slot.locator('option')).not.toHaveCount(0);
    await patientPage.getByRole('button', { name: /confirm booking/i }).click();

    await patientPage.goto('/patient/appointments');
    await expect(patientPage.getByText(/my appointments/i)).toBeVisible();
    await patientPage.getByRole('link', { name: /submit symptoms/i }).first().click();
    await expect(patientPage.getByRole('heading', { name: /my virtual consultations/i })).toBeVisible();
    await patientPage.locator('textarea').last().fill('Persistent fever and cough for three days');
    await patientPage.getByRole('button', { name: /enter room/i }).click();

    await doctorPage.goto('/doctor/consultations');
    await expect(doctorPage.getByText(/persistent fever and cough/i)).toBeVisible();
    await doctorPage.getByRole('link', { name: /start consultation/i }).first().click();
    await doctorPage.getByPlaceholder(/acute viral bronchitis/i).fill('Acute viral infection');
    await doctorPage.getByRole('button', { name: /start consultation/i }).click();
    await doctorPage.getByRole('button', { name: /save draft notes/i }).click();
    doctorPage.once('dialog', (dialog) => dialog.accept());
    await doctorPage.getByRole('button', { name: /complete consultation/i }).first().click();

    await doctorPage.getByRole('link', { name: /create prescription/i }).click();
    await doctorPage.getByPlaceholder(/paracetamol \/ amoxicillin/i).fill('Paracetamol');
    await doctorPage.getByRole('button', { name: /finalize & issue prescription/i }).click();

    await patientPage.goto('/patient/prescriptions');
    await expect(patientPage.getByText(/paracetamol/i)).toBeVisible();
    await expect(patientPage.getByText(/finalized/i)).toBeVisible();
  });
});
