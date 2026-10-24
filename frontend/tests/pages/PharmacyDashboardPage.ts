import { Page, Locator, expect } from '@playwright/test';

/**
 * PharmacyDashboardPage — Page Object Model
 * Covers: /pharmacy, /pharmacy/orders, /pharmacy/inventory, /pharmacy/profile
 */
export class PharmacyDashboardPage {
  readonly page: Page;

  readonly dashboardLink: Locator;
  readonly ordersLink: Locator;
  readonly inventoryLink: Locator;
  readonly profileLink: Locator;
  readonly logoutButton: Locator;
  readonly portalLabel: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dashboardLink = page.getByRole('link', { name: /dashboard/i }).first();
    this.ordersLink = page.getByRole('link', { name: /orders/i }).first();
    this.inventoryLink = page.getByRole('link', { name: /inventory/i }).first();
    this.profileLink = page.getByRole('link', { name: /pharmacy profile/i }).first();
    this.logoutButton = page.getByRole('button', { name: /logout|sign out/i }).first();
    this.portalLabel = page.getByText(/pharmacy portal/i).first();
  }

  async goto(): Promise<void> {
    await this.page.goto('/pharmacy');
    await this.page.waitForLoadState('domcontentloaded');
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/\/pharmacy/);
    await expect(this.portalLabel).toBeVisible({ timeout: 10000 });
  }

  async navigateToOrders(): Promise<void> {
    await this.ordersLink.click();
    await expect(this.page).toHaveURL(/\/pharmacy\/orders/);
  }

  async navigateToInventory(): Promise<void> {
    await this.inventoryLink.click();
    await expect(this.page).toHaveURL(/\/pharmacy\/inventory/);
  }

  async navigateToProfile(): Promise<void> {
    await this.profileLink.click();
    await expect(this.page).toHaveURL(/\/pharmacy\/profile/);
  }

  async logout(): Promise<void> {
    await this.logoutButton.click();
    await expect(this.page).toHaveURL(/\/login/);
  }
}
