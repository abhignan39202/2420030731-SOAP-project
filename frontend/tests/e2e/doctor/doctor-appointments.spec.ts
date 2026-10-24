import { test } from '../../fixtures/auth';
import { AppointmentPage } from '../../pages/AppointmentPage';

test.describe('Doctor Appointments Management', () => {
  test('doctor appointments page loads correctly', async ({ doctorPage }) => {
    const pageObj = new AppointmentPage(doctorPage);
    await pageObj.gotoDoctor();
    await pageObj.expectPageLoaded();
    await pageObj.expectAppointmentsVisible();
  });
});
