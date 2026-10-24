import { test, expect } from '../../fixtures/auth';
import { PatientDashboardPage } from '../../pages/PatientDashboardPage';

test.describe('Patient Dashboard Features', () => {
  test('patient dashboard displays user header and primary actions', async ({ patientPage }) => {
    const dashboard = new PatientDashboardPage(patientPage);
    await dashboard.goto();
    await dashboard.expectLoaded();
    await expect(patientPage.getByText(/patient/i).first()).toBeVisible();
  });

  test('patient dashboard contains quick links to emergency and appointments', async ({ patientPage }) => {
    const dashboard = new PatientDashboardPage(patientPage);
    await dashboard.goto();
    await expect(dashboard.emergencyLink).toBeVisible();
    await expect(dashboard.appointmentsLink).toBeVisible();
  });
});
