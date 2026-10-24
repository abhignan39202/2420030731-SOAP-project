import { test, expect } from '../../fixtures/auth';

/**
 * Emergency History Page Tests
 * Verifies: listing completed emergencies, filtering by status, viewing details.
 */

test.describe('Ambulance Emergency History', () => {

  test('history page renders filter buttons and empty state', async ({ ambulancePage }) => {
    await ambulancePage.route('**/api/ambulance/operator/history', (route) => {
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });

    await ambulancePage.goto('/ambulance/history');

    await expect(ambulancePage.getByText('Emergency History')).toBeVisible();
    await expect(ambulancePage.getByRole('button', { name: 'ALL' })).toBeVisible();
    await expect(ambulancePage.getByRole('button', { name: 'COMPLETED' })).toBeVisible();
    await expect(ambulancePage.getByRole('button', { name: 'CANCELLED' })).toBeVisible();
    await expect(ambulancePage.getByText('No dispatch records found.')).toBeVisible();
  });

  test('history page lists completed emergencies and filters by status', async ({ ambulancePage }) => {
    const mockHistory = [
      {
        id: 101,
        patientId: 100,
        pickupAddress: '45 Station Road',
        hospitalName: 'General Hospital',
        status: 'COMPLETED',
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      },
      {
        id: 102,
        patientId: 101,
        pickupAddress: '88 Market Yard',
        hospitalName: 'District Hospital',
        status: 'CANCELLED',
        createdAt: new Date().toISOString(),
      },
    ];

    await ambulancePage.route('**/api/ambulance/operator/history', (route) => {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockHistory) });
    });

    await ambulancePage.goto('/ambulance/history');

    // Both should be visible under ALL filter
    await expect(ambulancePage.getByText('45 Station Road')).toBeVisible();
    await expect(ambulancePage.getByText('88 Market Yard')).toBeVisible();

    // Filter by COMPLETED
    await ambulancePage.getByRole('button', { name: 'COMPLETED' }).click();
    await expect(ambulancePage.getByText('45 Station Road')).toBeVisible();
    await expect(ambulancePage.getByText('88 Market Yard')).not.toBeVisible();

    // Filter by CANCELLED
    await ambulancePage.getByRole('button', { name: 'CANCELLED' }).click();
    await expect(ambulancePage.getByText('45 Station Road')).not.toBeVisible();
    await expect(ambulancePage.getByText('88 Market Yard')).toBeVisible();
  });

});
