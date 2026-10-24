import { test, expect } from '../../fixtures/auth';

test.describe('Pharmacy Role Security & Isolation E2E', () => {
  test('patient role cannot access /pharmacy dashboard', async ({ patientPage }) => {
    await patientPage.goto('/pharmacy');
    // Patient should not remain on /pharmacy
    await expect(patientPage).not.toHaveURL(/\/pharmacy$/);
  });

  test('doctor role cannot access /pharmacy dashboard', async ({ doctorPage }) => {
    await doctorPage.goto('/pharmacy');
    // Doctor should not remain on /pharmacy
    await expect(doctorPage).not.toHaveURL(/\/pharmacy$/);
  });
});
