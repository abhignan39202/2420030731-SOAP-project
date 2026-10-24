import { test, expect } from '../../fixtures/auth';
import { attachConsoleErrorListener } from '../../utils/test-helpers';

test.describe('Console Errors Audit', () => {
  test('patient navigation produces no unexpected console errors', async ({ patientPage }) => {
    const consoleErrors = attachConsoleErrorListener(patientPage);

    await patientPage.goto('/patient');
    await patientPage.goto('/patient/doctors');
    await patientPage.goto('/patient/appointments');

    expect(consoleErrors).toEqual([]);
  });

  test('doctor navigation produces no unexpected console errors', async ({ doctorPage }) => {
    const consoleErrors = attachConsoleErrorListener(doctorPage);

    await doctorPage.goto('/doctor');
    await doctorPage.goto('/doctor/consultations');
    await doctorPage.goto('/doctor/prescriptions');

    expect(consoleErrors).toEqual([]);
  });
});
