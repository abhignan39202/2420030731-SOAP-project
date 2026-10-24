import { test, expect } from '../../fixtures/auth';

test.describe('Role-Based Access Security', () => {
  test('patient attempting doctor route is handled', async ({ patientPage }) => {
    await patientPage.goto('/doctor/consultations');
    // Expect URL redirect or protection handled
    await expect(patientPage).not.toHaveURL(/\/doctor\/consultations/);
  });

  test('doctor cannot open patient pages or call patient-only APIs', async ({ doctorPage }) => {
    const patientRequests: string[] = [];
    doctorPage.on('request', (request) => {
      if (/\/api\/(appointments\/patient|medicines|medications|pharmacy\/orders\/patient|emergency)/.test(request.url())) {
        patientRequests.push(request.url());
      }
    });

    for (const path of ['/patient/appointments', '/patient/medicines', '/patient/orders', '/patient/emergency']) {
      await doctorPage.goto(path);
      await expect(doctorPage).toHaveURL(/\/doctor$/);
    }

    expect(patientRequests).toEqual([]);
  });

  test('unauthenticated user attempting protected route gets redirected to login', async ({ page }) => {
    await page.goto('/patient/consultations');
    await expect(page).toHaveURL(/\/login/);
  });
});
