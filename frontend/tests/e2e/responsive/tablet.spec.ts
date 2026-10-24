import { test, expect } from '../../fixtures/auth';

test.describe('Tablet Viewport Responsiveness (768x1024)', () => {
  test.use({ viewport: { width: 768, height: 1024 } });

  test('patient layout renders on tablet', async ({ patientPage }) => {
    await patientPage.goto('/patient');
    await expect(patientPage).toHaveURL(/\/patient/);
  });

  test('doctor layout renders on tablet', async ({ doctorPage }) => {
    await doctorPage.goto('/doctor');
    await expect(doctorPage).toHaveURL(/\/doctor/);
  });
});
