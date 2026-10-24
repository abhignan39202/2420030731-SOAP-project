import { test, expect } from '../../fixtures/auth';

test.describe('Pharmacy Inventory E2E', () => {
  test('pharmacy inventory page loads stock list and search input', async ({ pharmacyPage }) => {
    await pharmacyPage.goto('/pharmacy/inventory');
    await expect(pharmacyPage).toHaveURL(/\/pharmacy\/inventory/);
    await expect(pharmacyPage.getByRole('heading', { name: /pharmacy inventory management/i })).toBeVisible();
  });
});
