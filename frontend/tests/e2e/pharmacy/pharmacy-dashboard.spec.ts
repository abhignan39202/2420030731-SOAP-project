import { test, expect } from '../../fixtures/auth';
import { PharmacyDashboardPage } from '../../pages/PharmacyDashboardPage';

test.describe('Pharmacy Dashboard E2E', () => {
  test('pharmacy dashboard loads metrics and quick links', async ({ pharmacyPage }) => {
    const dashboard = new PharmacyDashboardPage(pharmacyPage);
    await dashboard.goto();
    await dashboard.expectLoaded();
  });

  test('navigate to pharmacy orders', async ({ pharmacyPage }) => {
    const dashboard = new PharmacyDashboardPage(pharmacyPage);
    await dashboard.goto();
    await dashboard.navigateToOrders();
    await expect(pharmacyPage).toHaveURL(/\/pharmacy\/orders/);
  });

  test('navigate to pharmacy inventory', async ({ pharmacyPage }) => {
    const dashboard = new PharmacyDashboardPage(pharmacyPage);
    await dashboard.goto();
    await dashboard.navigateToInventory();
    await expect(pharmacyPage).toHaveURL(/\/pharmacy\/inventory/);
  });

  test('navigate to pharmacy profile', async ({ pharmacyPage }) => {
    const dashboard = new PharmacyDashboardPage(pharmacyPage);
    await dashboard.goto();
    await dashboard.navigateToProfile();
    await expect(pharmacyPage).toHaveURL(/\/pharmacy\/profile/);
  });
});
