import { Page, Locator, expect } from '@playwright/test';

/**
 * MedicinePage — Page Object Model
 * Covers: /patient/medicines
 */
export class MedicinePage {
  readonly page: Page;

  readonly medicineList: Locator;
  readonly markTakenButton: Locator;
  readonly markSkippedButton: Locator;
  readonly reminderSection: Locator;
  readonly todayHeader: Locator;
  readonly emptyState: Locator;

  constructor(page: Page) {
    this.page = page;
    this.medicineList = page.locator('[class*="space-y"], ul, [class*="list"]').first();
    this.markTakenButton = page.getByRole('button', { name: /mark taken|taken/i }).first();
    this.markSkippedButton = page.getByRole('button', { name: /skip|skipped/i }).first();
    this.reminderSection = page.getByText(/reminder|today/i).first();
    this.todayHeader = page.getByRole('heading', { name: /today|daily medicines/i }).first();
    this.emptyState = page.getByText(/no medicines|no reminders/i).first();
  }

  async goto(): Promise<void> {
    await this.page.goto('/patient/medicines');
    await this.page.waitForLoadState('domcontentloaded');
  }

  async expectPageLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/medicines/);
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  }

  async expectContentVisible(): Promise<void> {
    const hasMedicines = await this.medicineList.isVisible().catch(() => false);
    const hasEmpty = await this.emptyState.isVisible().catch(() => false);
    expect(hasMedicines || hasEmpty).toBeTruthy();
  }
}
