import { Page, Locator, expect } from '@playwright/test';

/**
 * EmergencyPage — Page Object Model
 * Covers: /patient/emergency
 */
export class EmergencyPage {
  readonly page: Page;

  readonly requestButton: Locator;
  readonly emergencyHeading: Locator;
  readonly statusSection: Locator;
  readonly activeEmergencySection: Locator;
  readonly locationField: Locator;
  readonly confirmButton: Locator;
  readonly emptyState: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emergencyHeading = page.getByRole('heading', { name: /emergency|ambulance|108/i }).first();
    this.requestButton = page.getByRole('button', { name: /request ambulance|call 108|emergency/i }).first();
    this.locationField = page.getByLabel(/location|address/i).first();
    this.confirmButton = page.getByRole('button', { name: /confirm|send request/i }).first();
    this.statusSection = page.getByText(/status|en_route|arrived/i).first();
    this.activeEmergencySection = page.getByText(/active emergency|current emergency/i).first();
    this.emptyState = page.getByText(/no active|no emergency/i).first();
  }

  async goto(): Promise<void> {
    await this.page.goto('/patient/emergency');
    await this.page.waitForLoadState('domcontentloaded');
  }

  async expectPageLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/emergency/);
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  }

  async expectEmergencyUIVisible(): Promise<void> {
    const hasHeading = await this.emergencyHeading.isVisible().catch(() => false);
    const hasButton = await this.requestButton.isVisible().catch(() => false);
    expect(hasHeading || hasButton).toBeTruthy();
  }
}
