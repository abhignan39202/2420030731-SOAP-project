import { test, expect } from '../../fixtures/auth';
import { DoctorDashboardPage } from '../../pages/DoctorDashboardPage';

test.describe('Full Doctor E2E Journey', () => {
  test('doctor logs in, navigates through appointments, consultations, prescriptions, and patients', async ({ doctorPage }) => {
    const dashboard = new DoctorDashboardPage(doctorPage);

    // Step 1: Doctor Dashboard
    await dashboard.goto();
    await dashboard.expectLoaded();

    // Step 2: Appointments
    await dashboard.navigateToAppointments();
    await expect(doctorPage).toHaveURL(/\/doctor\/appointments/);

    // Step 3: Consultations
    await dashboard.navigateToConsultations();
    await expect(doctorPage).toHaveURL(/\/doctor\/consultations/);

    // Step 4: Prescriptions
    await dashboard.navigateToPrescriptions();
    await expect(doctorPage).toHaveURL(/\/doctor\/prescriptions/);

    // Step 5: Patients
    await dashboard.navigateToPatients();
    await expect(doctorPage).toHaveURL(/\/doctor\/patients/);
  });
});
