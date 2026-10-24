import { test, expect } from '../../fixtures/auth';
import { mockApiError } from '../../utils/test-helpers';

type MockActiveEmergency = {
  id: number;
  patientId: number;
  pickupAddress: string;
  emergencyDescription: string;
  status: string;
  hospitalName: string;
  createdAt: string;
  assignedAmbulance: {
    id: number;
    registrationNumber: string;
    vehicleType: string;
    status: string;
    latitude?: number;
    longitude?: number;
    lastLocationUpdate?: string;
  };
};

/**
 * Ambulance Emergency Page Tests
 * Verifies: empty state, status timeline, confirmation modal, error handling.
 */

test.describe('Ambulance Emergency Page', () => {

  test('shows empty state when no active emergency', async ({ ambulancePage }) => {
    // Mock the operator/active endpoint to return 204 No Content
    await ambulancePage.route('**/api/ambulance/operator/active', (route) => {
      route.fulfill({ status: 204, body: '' });
    });

    await ambulancePage.goto('/ambulance/emergency');

    await expect(ambulancePage.getByText('No Active Emergency Assignment')).toBeVisible();
  });

  test('shows active emergency details when assignment exists', async ({ ambulancePage }) => {
    const mockEmergency = {
      id: 42,
      patientId: 100,
      pickupAddress: '12 MG Road, Hyderabad',
      emergencyDescription: 'Road accident',
      status: 'ASSIGNED',
      hospitalName: 'District Hospital',
      estimatedArrivalMinutes: 8,
      assignedAmbulance: {
        id: 1,
        registrationNumber: 'AP-04-AM-1008',
        vehicleType: 'ADVANCED_LIFE_SUPPORT',
        status: 'ASSIGNED',
        latitude: 17.385,
        longitude: 78.4867,
      },
      assignedOperator: {
        id: 1,
        userId: 300,
        name: 'Ramesh Kumar (Operator)',
        phone: '+91 98765 00001',
        status: 'ASSIGNED',
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await ambulancePage.route('**/api/ambulance/operator/active', (route) => {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockEmergency) });
    });

    await ambulancePage.goto('/ambulance/emergency');

    await expect(ambulancePage.getByText('Emergency #42')).toBeVisible();
    await expect(ambulancePage.getByText('12 MG Road, Hyderabad')).toBeVisible();
    await expect(ambulancePage.getByText('District Hospital')).toBeVisible();
    await expect(ambulancePage.getByText('Emergency Timeline')).toBeVisible();
  });

  test('shows correct next-action button for ASSIGNED status', async ({ ambulancePage }) => {
    const mockEmergency = {
      id: 42, patientId: 100,
      pickupAddress: '12 MG Road, Hyderabad',
      emergencyDescription: 'Test',
      status: 'ASSIGNED',
      hospitalName: 'District Hospital',
      assignedAmbulance: { id: 1, registrationNumber: 'AP-04-AM-1008', vehicleType: 'ALS', status: 'ASSIGNED' },
      createdAt: new Date().toISOString(),
    };

    await ambulancePage.route('**/api/ambulance/operator/active', (route) => {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockEmergency) });
    });

    await ambulancePage.goto('/ambulance/emergency');

    // Only the EN_ROUTE button should appear for ASSIGNED status
    await expect(ambulancePage.getByRole('button', { name: /Start En Route/i })).toBeVisible();
    // COMPLETED button should NOT appear
    await expect(ambulancePage.getByRole('button', { name: /Complete Emergency/i })).not.toBeVisible();
  });

  test('confirmation modal appears before status transition', async ({ ambulancePage }) => {
    const mockEmergency = {
      id: 42, patientId: 100,
      pickupAddress: '12 MG Road, Hyderabad',
      emergencyDescription: 'Test', status: 'ASSIGNED',
      hospitalName: 'District Hospital',
      assignedAmbulance: { id: 1, registrationNumber: 'AP-04-AM-1008', vehicleType: 'ALS', status: 'ASSIGNED' },
      createdAt: new Date().toISOString(),
    };

    await ambulancePage.route('**/api/ambulance/operator/active', (route) => {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockEmergency) });
    });

    await ambulancePage.goto('/ambulance/emergency');
    await ambulancePage.getByRole('button', { name: /Start En Route/i }).click();

    // Confirmation modal should appear
    await expect(ambulancePage.getByText('Confirm Status Change')).toBeVisible();
    await expect(ambulancePage.getByRole('button', { name: 'Cancel' })).toBeVisible();
    await expect(ambulancePage.getByRole('button', { name: 'Confirm' })).toBeVisible();
  });

  test('cancel button dismisses confirmation modal without transition', async ({ ambulancePage }) => {
    const mockEmergency = {
      id: 42, patientId: 100,
      pickupAddress: '12 MG Road', emergencyDescription: 'Test',
      status: 'ASSIGNED', hospitalName: 'Hospital',
      assignedAmbulance: { id: 1, registrationNumber: 'AP-04-AM-1008', vehicleType: 'ALS', status: 'ASSIGNED' },
      createdAt: new Date().toISOString(),
    };

    await ambulancePage.route('**/api/ambulance/operator/active', (route) => {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockEmergency) });
    });

    await ambulancePage.goto('/ambulance/emergency');
    await ambulancePage.getByRole('button', { name: /Start En Route/i }).click();
    await expect(ambulancePage.getByText('Confirm Status Change')).toBeVisible();

    await ambulancePage.getByRole('button', { name: 'Cancel' }).click();
    await expect(ambulancePage.getByText('Confirm Status Change')).not.toBeVisible();
  });

  test('shows GPS sharing controls and the last reported ambulance coordinates', async ({ ambulancePage }) => {
    const mockEmergency = {
      id: 42, patientId: 100,
      pickupAddress: '12 MG Road', emergencyDescription: 'Test',
      status: 'EN_ROUTE', hospitalName: 'Hospital',
      assignedAmbulance: { id: 1, registrationNumber: 'AP-04-AM-1008', vehicleType: 'ALS', status: 'EN_ROUTE',
        latitude: 17.385, longitude: 78.4867, lastLocationUpdate: new Date().toISOString() },
      createdAt: new Date().toISOString(),
    };

    await ambulancePage.route('**/api/ambulance/operator/active', (route) => {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockEmergency) });
    });

    await ambulancePage.goto('/ambulance/emergency');
    await expect(ambulancePage.getByRole('heading', { name: /Live GPS location/i })).toBeVisible();
    await expect(ambulancePage.getByText(/17\.38500, 78\.48670/)).toBeVisible();
    await expect(ambulancePage.getByRole('button', { name: /Start sharing GPS location/i })).toBeVisible();
  });

  test('operator submits device GPS coordinates and timestamp to the backend', async ({ ambulancePage }) => {
    await ambulancePage.context().grantPermissions(['geolocation']);
    await ambulancePage.context().setGeolocation({ latitude: 17.4021, longitude: 78.5123 });

    let currentEmergency: MockActiveEmergency = {
      id: 42, patientId: 100,
      pickupAddress: '12 MG Road', emergencyDescription: 'Test',
      status: 'EN_ROUTE', hospitalName: 'Hospital',
      assignedAmbulance: { id: 1, registrationNumber: 'AP-04-AM-1008', vehicleType: 'ALS', status: 'EN_ROUTE' },
      createdAt: new Date().toISOString(),
    };
    let sentLocation: { latitude: number; longitude: number; timestamp: string } | undefined;

    await ambulancePage.route('**/api/ambulance/operator/active', (route) => {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(currentEmergency) });
    });
    await ambulancePage.route('**/api/ambulances/1/location', async (route) => {
      sentLocation = route.request().postDataJSON() as { latitude: number; longitude: number; timestamp: string };
      currentEmergency = {
        ...currentEmergency,
        assignedAmbulance: { ...currentEmergency.assignedAmbulance, ...sentLocation, lastLocationUpdate: sentLocation.timestamp },
      };
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(currentEmergency.assignedAmbulance) });
    });

    await ambulancePage.goto('/ambulance/emergency');
    const locationRequest = ambulancePage.waitForRequest(request =>
      request.url().includes('/api/ambulances/1/location') && request.method() === 'PATCH');
    await ambulancePage.getByRole('button', { name: /Start sharing GPS location/i }).click();
    await locationRequest;

    expect(sentLocation).toBeDefined();
    expect(sentLocation!.latitude).toBeCloseTo(17.4021, 4);
    expect(sentLocation!.longitude).toBeCloseTo(78.5123, 4);
    expect(Number.isNaN(Date.parse(sentLocation!.timestamp))).toBe(false);
    await expect(ambulancePage.getByRole('button', { name: /Stop sharing location/i })).toBeVisible();
    await expect(ambulancePage.getByText(/17\.40210, 78\.51230/)).toBeVisible();
    await ambulancePage.getByRole('button', { name: /Stop sharing location/i }).click();
    await expect(ambulancePage.getByRole('button', { name: /Start sharing GPS location/i })).toBeVisible();
  });

  test('shows Simulated ETA when estimatedArrivalMinutes is present', async ({ ambulancePage }) => {
    const mockEmergency = {
      id: 42, patientId: 100,
      pickupAddress: '12 MG Road', emergencyDescription: 'Test',
      status: 'ASSIGNED', hospitalName: 'Hospital',
      estimatedArrivalMinutes: 12,
      assignedAmbulance: { id: 1, registrationNumber: 'AP-04-AM-1008', vehicleType: 'ALS', status: 'ASSIGNED' },
      createdAt: new Date().toISOString(),
    };

    await ambulancePage.route('**/api/ambulance/operator/active', (route) => {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockEmergency) });
    });

    await ambulancePage.goto('/ambulance/emergency');
    await expect(ambulancePage.getByText(/Simulated ETA/i)).toBeVisible();
    await expect(ambulancePage.getByText('12 min')).toBeVisible();
  });

  test('API error shows appropriate error message with retry button', async ({ ambulancePage }) => {
    await mockApiError(ambulancePage, '**/api/ambulance/operator/active', 503);

    await ambulancePage.goto('/ambulance/emergency');

    await expect(ambulancePage.getByText(/could not be loaded/i)).toBeVisible();
    await expect(ambulancePage.getByRole('button', { name: /retry/i })).toBeVisible();
  });

});
