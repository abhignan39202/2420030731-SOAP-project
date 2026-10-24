import { test, expect } from '../../fixtures/auth';

test.describe('Doctor Patients Roster', () => {
  test('doctor patient roster page loads', async ({ doctorPage }) => {
    await doctorPage.goto('/doctor/patients');
    await expect(doctorPage).toHaveURL(/\/doctor\/patients/);
  });
});
