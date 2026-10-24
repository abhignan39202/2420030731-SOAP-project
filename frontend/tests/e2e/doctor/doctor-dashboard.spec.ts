import { test, expect } from '../../fixtures/auth';
import { DoctorDashboardPage } from '../../pages/DoctorDashboardPage';

test.describe('Doctor Dashboard', () => {
  test('doctor dashboard renders headers and statistics overview', async ({ doctorPage }) => {
    const dashboard = new DoctorDashboardPage(doctorPage);
    await dashboard.goto();
    await dashboard.expectLoaded();
  });
});
