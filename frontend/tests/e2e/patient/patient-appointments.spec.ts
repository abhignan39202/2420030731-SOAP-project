import { test, expect } from '../../fixtures/auth';
import { AppointmentPage } from '../../pages/AppointmentPage';

test.describe('Patient Appointments', () => {
  test('patient appointments page loads and displays appointment state', async ({ patientPage }) => {
    const appointmentPage = new AppointmentPage(patientPage);
    await appointmentPage.gotoPatient();
    await appointmentPage.expectPageLoaded();
    await appointmentPage.expectAppointmentsVisible();
  });
});
