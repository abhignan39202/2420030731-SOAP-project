import { test, expect } from '../../fixtures/auth';
import { DoctorDashboardPage } from '../../pages/DoctorDashboardPage';

/**
 * Smoke Test: Doctor Navigation Links
 * Verifies Doctor Portal layout and sidebar links render correctly.
 */
test.describe('Doctor Navigation — Smoke', () => {
  test('doctor layout loads sidebar and top header', async ({ doctorPage }) => {
    const dashboard = new DoctorDashboardPage(doctorPage);
    await dashboard.goto();
    await dashboard.expectLoaded();
  });

  test('navigate to Doctor Appointments', async ({ doctorPage }) => {
    const dashboard = new DoctorDashboardPage(doctorPage);
    await dashboard.goto();
    await dashboard.navigateToAppointments();
    await expect(doctorPage).toHaveURL(/\/doctor\/appointments/);
  });

  test('navigate to Doctor Consultations', async ({ doctorPage }) => {
    const dashboard = new DoctorDashboardPage(doctorPage);
    await dashboard.goto();
    await dashboard.navigateToConsultations();
    await expect(doctorPage).toHaveURL(/\/doctor\/consultations/);
  });

  test('navigate to Doctor Prescriptions', async ({ doctorPage }) => {
    const dashboard = new DoctorDashboardPage(doctorPage);
    await dashboard.goto();
    await dashboard.navigateToPrescriptions();
    await expect(doctorPage).toHaveURL(/\/doctor\/prescriptions/);
  });

  test('navigate to Doctor My Patients', async ({ doctorPage }) => {
    const dashboard = new DoctorDashboardPage(doctorPage);
    await dashboard.goto();
    await dashboard.navigateToPatients();
    await expect(doctorPage).toHaveURL(/\/doctor\/patients/);
  });
});
