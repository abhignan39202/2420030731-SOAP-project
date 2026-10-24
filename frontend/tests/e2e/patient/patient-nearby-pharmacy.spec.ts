import { test, expect } from '../../fixtures/auth';

test.describe('Patient nearby pharmacy discovery', () => {
  test.skip(!process.env.E2E_BACKEND, 'Requires the running gateway, pharmacy service, and configured places provider');

  test('requests location after an explicit click and handles a granted permission', async ({ patientPage }) => {
    const origin = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
    const context = patientPage.context();
    await context.grantPermissions(['geolocation'], { origin });
    await context.setGeolocation({ latitude: 17.385, longitude: 78.4867 });
    await patientPage.goto('/patient/orders');

    const nearbyRequest = patientPage.waitForResponse((response) =>
      response.url().includes('/api/pharmacy/nearby') && response.request().method() === 'GET',
    );
    await patientPage.getByRole('button', { name: 'Use My Current Location' }).click();
    const response = await nearbyRequest;
    expect(response.status()).toBe(200);

    // The result is provider data. A legitimate provider may have no pharmacies in the radius.
    await expect(patientPage.locator('[data-testid="nearby-results"], [data-testid="nearby-empty"]').first()).toBeVisible();
  });

  test('shows a permission error when the browser denies location', async ({ patientPage }) => {
    const origin = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
    await patientPage.context().grantPermissions([], { origin });
    await patientPage.goto('/patient/orders');

    let nearbyCalls = 0;
    patientPage.on('request', (request) => {
      if (request.url().includes('/api/pharmacy/nearby')) nearbyCalls += 1;
    });
    await patientPage.getByRole('button', { name: 'Use My Current Location' }).click();
    await expect(patientPage.getByTestId('location-error')).toContainText('permission was denied');
    expect(nearbyCalls).toBe(0);
  });
});
