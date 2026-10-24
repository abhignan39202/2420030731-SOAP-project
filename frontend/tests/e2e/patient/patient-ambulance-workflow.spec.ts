import { test, expect } from '@playwright/test';
import { setAuthStorage } from '../../utils/test-helpers';

const patientToken = process.env.E2E_PATIENT_TOKEN;
const operatorToken = process.env.E2E_AMBULANCE_TOKEN;
const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

test('patient request is saved, assigned operator sees it, and patient sees persisted status', async ({ browser }) => {
  test.skip(!patientToken || !operatorToken,
    'Requires real E2E_PATIENT_TOKEN and E2E_AMBULANCE_TOKEN against a running API and seeded available ambulance.');

  const patientId = Number(process.env.E2E_PATIENT_ID || 100);
  const operatorId = Number(process.env.E2E_AMBULANCE_ID || 300);
  const patientContext = await browser.newContext({
    permissions: ['geolocation'],
    geolocation: { latitude: 17.385, longitude: 78.4867 },
  });
  const operatorContext = await browser.newContext();
  let emergencyId: number | undefined;

  try {
    // Clear an earlier active run for this dedicated E2E account before creating a new request.
    const activeBeforeTest = await patientContext.request.get(`${apiBaseUrl}/api/emergency/my-active`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    if (activeBeforeTest.status() === 200) {
      const existing = await activeBeforeTest.json();
      await patientContext.request.patch(`${apiBaseUrl}/api/emergency/${existing.id}/cancel`, {
        headers: { Authorization: `Bearer ${patientToken}` },
      });
    } else {
      expect(activeBeforeTest.status()).toBe(204);
    }

    const patientPage = await patientContext.newPage();
    await setAuthStorage(patientPage, { id: patientId, username: 'e2e_patient', roles: ['PATIENT'] }, patientToken!);
    await patientPage.goto('/patient/emergency');
    await expect(patientPage.getByRole('button', { name: /request ambulance now/i })).toBeVisible();

    await patientPage.getByRole('button', { name: /request ambulance now/i }).click();
    await patientPage.getByLabel(/pickup address or nearby landmark/i).fill('Village Center, near the clinic');

    const createResponsePromise = patientPage.waitForResponse(response =>
      response.url().includes('/api/emergency/request') && response.request().method() === 'POST');
    await patientPage.getByRole('button', { name: /confirm & request ambulance/i }).click();
    const createResponse = await createResponsePromise;
    expect(createResponse.status()).toBe(201);
    const created = await createResponse.json();
    emergencyId = created.id;
    expect(created.status).toBe('ASSIGNED');
    expect(created.patientId).toBe(patientId);
    expect(created.pickupLatitude).toBeCloseTo(17.385, 3);
    expect(created.pickupLongitude).toBeCloseTo(78.4867, 3);
    expect(created.assignedAmbulance).toBeTruthy();
    expect(created.assignedOperator).toBeTruthy();
    await expect(patientPage.getByText('ASSIGNED', { exact: true }).first()).toBeVisible();

    const operatorPage = await operatorContext.newPage();
    await setAuthStorage(operatorPage, { id: operatorId, username: 'e2e_operator', roles: ['AMBULANCE_OPERATOR'] }, operatorToken!);
    await operatorPage.goto('/ambulance/emergency');
    await expect(operatorPage.getByText(`Emergency #${created.id}`, { exact: true })).toBeVisible();
    await expect(operatorPage.getByText('Village Center, near the clinic')).toBeVisible();

    // Reload the patient view to confirm it is served from persisted backend state.
    await patientPage.reload();
    await expect(patientPage.getByText('ASSIGNED', { exact: true }).first()).toBeVisible();

    // Release the seeded unit so repeated E2E runs do not leave it occupied.
    patientPage.once('dialog', dialog => dialog.accept());
    await patientPage.getByRole('button', { name: /cancel request/i }).click();
    await expect(patientPage.getByText('CANCELLED', { exact: true }).first()).toBeVisible();
  } finally {
    if (emergencyId) {
      await patientContext.request.patch(`${apiBaseUrl}/api/emergency/${emergencyId}/cancel`, {
        headers: { Authorization: `Bearer ${patientToken}` },
      }).catch(() => {});
    }
    await patientContext.close();
    await operatorContext.close();
  }
});
