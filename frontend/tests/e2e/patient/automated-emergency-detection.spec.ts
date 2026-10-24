import { test, expect } from '../../fixtures/auth';
import type { Page, Route } from '@playwright/test';

async function grantTestSensorPermissions(page: Page) {
  await page.addInitScript(() => {
    for (const constructor of [window.DeviceMotionEvent, window.DeviceOrientationEvent]) {
      if (!constructor) continue;
      Object.defineProperty(constructor, 'requestPermission', {
        configurable: true,
        value: async () => 'granted',
      });
    }
  });
}

async function stubEmergencyApi(page: Page) {
  let savedEmergency: Record<string, unknown> | null = null;
  let postBody: Record<string, unknown> | null = null;
  let postCount = 0;

  await page.route('**/api/emergency/**', async (route: Route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    if (pathname.endsWith('/my-active')) {
      await route.fulfill({ json: savedEmergency });
      return;
    }
    if (pathname.endsWith('/history')) {
      await route.fulfill({ json: savedEmergency ? [savedEmergency] : [] });
      return;
    }
    if (pathname.endsWith('/request') && request.method() === 'POST') {
      postCount += 1;
      postBody = request.postDataJSON() as Record<string, unknown>;
      savedEmergency = {
        id: 908,
        patientId: 100,
        pickupAddress: postBody.pickupAddress,
        pickupLatitude: postBody.pickupLatitude,
        pickupLongitude: postBody.pickupLongitude,
        emergencyDescription: postBody.emergencyDescription,
        status: 'ASSIGNED',
        assignedAmbulance: { id: 4, registrationNumber: 'KA-00-TEST', vehicleType: 'BASIC', status: 'ASSIGNED' },
        createdAt: new Date().toISOString(),
      };
      await route.fulfill({ status: 201, json: savedEmergency });
      return;
    }
    await route.continue();
  });

  return {
    get postCount() { return postCount; },
    get postBody() { return postBody; },
  };
}

async function emitNormalMovement(page: Page) {
  await page.evaluate(() => {
    window.dispatchEvent(Object.assign(new Event('deviceorientation'), { beta: 0, gamma: 0 }));
    window.dispatchEvent(Object.assign(new Event('devicemotion'), {
      accelerationIncludingGravity: { x: 0, y: 0, z: 9.80665 },
      rotationRate: { alpha: 0, beta: 4, gamma: 0 },
    }));
    window.dispatchEvent(Object.assign(new Event('deviceorientation'), { beta: 22, gamma: 10 }));
    window.dispatchEvent(Object.assign(new Event('devicemotion'), {
      accelerationIncludingGravity: { x: 0, y: 0, z: 9.80665 },
      rotationRate: { alpha: 0, beta: 8, gamma: 0 },
    }));
  });
}

async function emitPossibleFall(page: Page) {
  // Synthetic sensor input exists only in this browser test; production reads browser sensor events.
  await page.evaluate(() => {
    window.dispatchEvent(Object.assign(new Event('deviceorientation'), { beta: 0, gamma: 0 }));
    window.dispatchEvent(Object.assign(new Event('devicemotion'), {
      accelerationIncludingGravity: { x: 0, y: 0, z: 3.1 * 9.80665 },
      rotationRate: { alpha: 0, beta: 175, gamma: 0 },
    }));
    window.dispatchEvent(Object.assign(new Event('deviceorientation'), { beta: 62, gamma: 4 }));
  });
}

test.describe('Prototype automated emergency detection', () => {
  test('normal movement does not show an emergency prompt', async ({ patientPage }) => {
    await grantTestSensorPermissions(patientPage);
    await stubEmergencyApi(patientPage);
    await patientPage.goto('/patient/emergency');
    await patientPage.getByRole('button', { name: 'Enable prototype monitoring' }).click();
    await expect(patientPage.getByText(/Monitoring motion on this page/)).toBeVisible();
    await emitNormalMovement(patientPage);
    await expect(patientPage.getByRole('alertdialog')).toHaveCount(0);
  });

  test('possible fall prompts patient and cancellation submits no SOS', async ({ patientPage }) => {
    await grantTestSensorPermissions(patientPage);
    const api = await stubEmergencyApi(patientPage);
    await patientPage.goto('/patient/emergency');
    await patientPage.getByRole('button', { name: 'Enable prototype monitoring' }).click();
    await expect(patientPage.getByText(/Monitoring motion on this page/)).toBeVisible();
    await emitPossibleFall(patientPage);

    await expect(patientPage.getByRole('heading', { name: 'ARE YOU OK?' })).toBeVisible();
    await expect(patientPage.getByText(/20 seconds/)).toBeVisible();
    await patientPage.getByRole('button', { name: /I’m OK — cancel SOS/ }).click();
    await expect(patientPage.getByText('Cancelled. No SOS request was submitted.')).toBeVisible();
    expect(api.postCount).toBe(0);
  });

  test('countdown timeout submits one GPS-backed SOS to the emergency API', async ({ patientPage, context }) => {
    await grantTestSensorPermissions(patientPage);
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 12.9716, longitude: 77.5946 });
    const api = await stubEmergencyApi(patientPage);
    await patientPage.goto('/patient/emergency');
    await patientPage.getByRole('button', { name: 'Enable prototype monitoring' }).click();
    await expect(patientPage.getByText(/Monitoring motion on this page/)).toBeVisible();
    await patientPage.clock.install();
    await emitPossibleFall(patientPage);
    await expect(patientPage.getByRole('heading', { name: 'ARE YOU OK?' })).toBeVisible();

    await patientPage.clock.fastForward(20_000);
    await expect(patientPage.getByText(/Active Dispatch #908/)).toBeVisible({ timeout: 15_000 });
    expect(api.postCount).toBe(1);
    expect(api.postBody).toMatchObject({
      pickupLatitude: 12.9716,
      pickupLongitude: 77.5946,
    });
    expect(String(api.postBody?.emergencyDescription)).toMatch(/no response to the 20-second wellbeing check/i);
  });
});
