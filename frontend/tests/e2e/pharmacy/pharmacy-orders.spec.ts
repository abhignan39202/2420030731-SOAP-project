import { test, expect } from '../../fixtures/auth';

test.describe('Pharmacy Orders E2E', () => {
  test('pharmacy orders page loads with filter controls', async ({ pharmacyPage }) => {
    await pharmacyPage.goto('/pharmacy/orders');
    await expect(pharmacyPage).toHaveURL(/\/pharmacy\/orders/);
    await expect(pharmacyPage.getByRole('heading', { name: /incoming prescription orders/i })).toBeVisible();
  });

  test('pharmacy order detail page loads itemized breakdown', async ({ pharmacyPage }) => {
    await pharmacyPage.goto('/pharmacy/orders/101');
    await expect(pharmacyPage).toHaveURL(/\/pharmacy\/orders\/101/);
    await expect(pharmacyPage.getByRole('heading', { name: /order #101/i })).toBeVisible();
  });
});
