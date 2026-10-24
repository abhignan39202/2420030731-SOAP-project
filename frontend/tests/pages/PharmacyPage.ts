import { Page, Locator, expect } from '@playwright/test';

/**
 * PharmacyPage — Page Object Model
 * Covers: /patient/orders
 */
export class PharmacyPage {
  readonly page: Page;

  readonly orderList: Locator;
  readonly placeOrderButton: Locator;
  readonly orderStatusBadge: Locator;
  readonly emptyState: Locator;
  readonly pharmacySelect: Locator;
  readonly prescriptionSelect: Locator;
  readonly confirmOrderButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.orderList = page.locator('[class*="space-y"], ul, [class*="list"]').first();
    this.placeOrderButton = page.getByRole('button', { name: /place order|new order|order medicine/i }).first();
    this.orderStatusBadge = page.locator('[class*="badge"], [class*="status"]').first();
    this.emptyState = page.getByText(/no orders|no pharmacy/i).first();
    this.pharmacySelect = page.getByLabel(/pharmacy/i).first();
    this.prescriptionSelect = page.getByLabel(/prescription/i).first();
    this.confirmOrderButton = page.getByRole('button', { name: /confirm|place|submit order/i }).first();
  }

  async goto(): Promise<void> {
    await this.page.goto('/patient/orders');
    await this.page.waitForLoadState('domcontentloaded');
  }

  async expectPageLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/orders/);
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  }

  async expectContentVisible(): Promise<void> {
    const hasOrders = await this.orderList.isVisible().catch(() => false);
    const hasEmpty = await this.emptyState.isVisible().catch(() => false);
    const hasButton = await this.placeOrderButton.isVisible().catch(() => false);
    expect(hasOrders || hasEmpty || hasButton).toBeTruthy();
  }
}
