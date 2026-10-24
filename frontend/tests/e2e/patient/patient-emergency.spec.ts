import { test, expect } from '../../fixtures/auth';
import { EmergencyPage } from '../../pages/EmergencyPage';

test.describe('Patient Emergency & Ambulance', () => {
  test('patient emergency 108 page loads correctly', async ({ patientPage }) => {
    const pageObj = new EmergencyPage(patientPage);
    await pageObj.goto();
    await pageObj.expectPageLoaded();
    await pageObj.expectEmergencyUIVisible();
  });

  test('patient map refreshes to the latest persisted ambulance GPS position', async ({ patientPage }) => {
    let activePollCount = 0;
    const baseEmergency = {
      id: 75,
      patientId: 100,
      pickupAddress: 'Village Clinic Road',
      emergencyDescription: 'Test emergency',
      status: 'EN_ROUTE',
      assignedAmbulance: {
        id: 12,
        registrationNumber: 'AP-04-AM-1012',
        vehicleType: 'BASIC',
        status: 'EN_ROUTE',
        latitude: 17.385,
        longitude: 78.4867,
        lastLocationUpdate: '2026-09-23T10:00:00Z',
      },
      assignedOperator: { id: 3, userId: 300, name: 'Operator', phone: '000', status: 'ASSIGNED' },
      createdAt: '2026-09-23T09:59:00Z',
    };

    await patientPage.route('**/api/emergency/my-active', (route) => {
      activePollCount += 1;
      const location = activePollCount < 2
        ? baseEmergency.assignedAmbulance
        : {
            ...baseEmergency.assignedAmbulance,
            latitude: 17.402,
            longitude: 78.512,
            lastLocationUpdate: '2026-09-23T10:00:05Z',
          };
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...baseEmergency, assignedAmbulance: location }),
      });
    });
    await patientPage.route('**/api/emergency/history', (route) => {
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });
    await patientPage.route('https://www.openstreetmap.org/**', (route) => route.abort());

    await patientPage.goto('/patient/emergency');
    await expect(patientPage.getByTestId('ambulance-coordinates')).toHaveText('17.38500, 78.48670');
    await expect(patientPage.getByTitle("Map of the ambulance's latest reported GPS position"))
      .toHaveAttribute('src', /marker=17\.385/);
    await expect(patientPage.getByTestId('ambulance-coordinates')).toHaveText('17.40200, 78.51200', { timeout: 12000 });
    await expect(patientPage.getByTitle("Map of the ambulance's latest reported GPS position"))
      .toHaveAttribute('src', /marker=17\.402/);
    expect(activePollCount).toBeGreaterThanOrEqual(2);
  });
});
