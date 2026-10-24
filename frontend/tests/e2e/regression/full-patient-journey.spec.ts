import { test, expect } from '../../fixtures/auth';
import { PatientDashboardPage } from '../../pages/PatientDashboardPage';
import { AppointmentPage } from '../../pages/AppointmentPage';

test.describe('Full Patient E2E Journey', () => {
  test('patient logs in, browses portal pages, checks appointments and emergency', async ({ patientPage }) => {
    const dashboard = new PatientDashboardPage(patientPage);

    // Step 1: Dashboard
    await dashboard.goto();
    await dashboard.expectLoaded();

    // Step 2: Find Doctors
    await dashboard.navigateToDoctors();
    await expect(patientPage).toHaveURL(/\/patient\/doctors/);

    // Step 3: Appointments
    await dashboard.navigateToAppointments();
    const apptPage = new AppointmentPage(patientPage);
    await apptPage.expectPageLoaded();

    // Step 4: Emergency
    await dashboard.navigateToEmergency();
    await expect(patientPage).toHaveURL(/\/patient\/emergency/);
  });
});
