import { Page, Locator, expect } from '@playwright/test';

/**
 * PrescriptionPage — Page Object Model
 * Covers: /patient/prescriptions, /doctor/prescriptions
 */
export class PrescriptionPage {
  readonly page: Page;

  readonly prescriptionList: Locator;
  readonly createButton: Locator;
  readonly medicineField: Locator;
  readonly dosageField: Locator;
  readonly frequencyField: Locator;
  readonly durationField: Locator;
  readonly finalizeButton: Locator;
  readonly saveDraftButton: Locator;
  readonly statusBadge: Locator;
  readonly emptyState: Locator;

  constructor(page: Page) {
    this.page = page;
    this.prescriptionList = page.locator('[class*="space-y"], ul, [class*="list"]').first();
    this.createButton = page.getByRole('button', { name: /create|new prescription|add prescription/i }).first();
    this.medicineField = page.getByLabel(/medicine|drug name/i).first();
    this.dosageField = page.getByLabel(/dosage|dose/i).first();
    this.frequencyField = page.getByLabel(/frequency/i).first();
    this.durationField = page.getByLabel(/duration/i).first();
    this.finalizeButton = page.getByRole('button', { name: /finalize|complete prescription/i }).first();
    this.saveDraftButton = page.getByRole('button', { name: /save draft|save/i }).first();
    this.statusBadge = page.locator('[class*="badge"], [class*="status"]').first();
    this.emptyState = page.getByText(/no prescriptions/i).first();
  }

  async gotoPatient(): Promise<void> {
    await this.page.goto('/patient/prescriptions');
    await this.page.waitForLoadState('domcontentloaded');
  }

  async gotoDoctor(): Promise<void> {
    await this.page.goto('/doctor/prescriptions');
    await this.page.waitForLoadState('domcontentloaded');
  }

  async expectPageLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/prescriptions/);
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  }
}
