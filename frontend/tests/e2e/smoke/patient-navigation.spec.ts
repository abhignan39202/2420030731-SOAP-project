import { test, expect } from '../../fixtures/auth';
import { PatientDashboardPage } from '../../pages/PatientDashboardPage';

/**
 * Smoke Test: Patient Navigation Links
 * Tests basic layout & nav links without requiring live backend responses.
 */
test.describe('Patient Navigation — Smoke', () => {
  test('patient dashboard layout renders sidebar and links', async ({ patientPage }) => {
    const dashboard = new PatientDashboardPage(patientPage);
    await dashboard.goto();
    await dashboard.expectLoaded();
  });

  test('navigate to Find Doctors page', async ({ patientPage }) => {
    const dashboard = new PatientDashboardPage(patientPage);
    await dashboard.goto();
    await dashboard.navigateToDoctors();
    await expect(patientPage).toHaveURL(/\/patient\/doctors/);
  });

  test('navigate to Appointments page', async ({ patientPage }) => {
    const dashboard = new PatientDashboardPage(patientPage);
    await dashboard.goto();
    await dashboard.navigateToAppointments();
    await expect(patientPage).toHaveURL(/\/patient\/appointments/);
  });

  test('navigate to Prescriptions page', async ({ patientPage }) => {
    const dashboard = new PatientDashboardPage(patientPage);
    await dashboard.goto();
    await dashboard.navigateToPrescriptions();
    await expect(patientPage).toHaveURL(/\/patient\/prescriptions/);
  });

  test('navigate to Medicines page', async ({ patientPage }) => {
    const dashboard = new PatientDashboardPage(patientPage);
    await dashboard.goto();
    await dashboard.navigateToMedicines();
    await expect(patientPage).toHaveURL(/\/patient\/medicines/);
  });

  test('navigate to Pharmacy Orders page', async ({ patientPage }) => {
    const dashboard = new PatientDashboardPage(patientPage);
    await dashboard.goto();
    await dashboard.navigateToPharmacy();
    await expect(patientPage).toHaveURL(/\/patient\/orders/);
  });

  test('navigate to Emergency page', async ({ patientPage }) => {
    const dashboard = new PatientDashboardPage(patientPage);
    await dashboard.goto();
    await dashboard.navigateToEmergency();
    await expect(patientPage).toHaveURL(/\/patient\/emergency/);
  });
});
