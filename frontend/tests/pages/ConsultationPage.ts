import { Page, Locator, expect } from '@playwright/test';

/**
 * ConsultationPage — Page Object Model
 * Covers: /doctor/consultations, /patient/consultations
 */
export class ConsultationPage {
  readonly page: Page;

  readonly consultationList: Locator;
  readonly statusBadge: Locator;
  readonly startButton: Locator;
  readonly completeButton: Locator;
  readonly notesField: Locator;
  readonly diagnosisField: Locator;
  readonly saveButton: Locator;
  readonly emptyState: Locator;

  constructor(page: Page) {
    this.page = page;
    this.consultationList = page.locator('[class*="space-y"], ul, [class*="list"]').first();
    this.statusBadge = page.locator('[class*="badge"], [class*="status"], [class*="pill"]').first();
    this.startButton = page.getByRole('button', { name: /start|begin consultation/i }).first();
    this.completeButton = page.getByRole('button', { name: /complete|finish/i }).first();
    this.notesField = page.getByLabel(/notes|clinical notes/i).first();
    this.diagnosisField = page.getByLabel(/diagnosis/i).first();
    this.saveButton = page.getByRole('button', { name: /save|save draft/i }).first();
    this.emptyState = page.getByText(/no consultations|no records/i).first();
  }

  async gotoDoctor(): Promise<void> {
    await this.page.goto('/doctor/consultations');
    await this.page.waitForLoadState('domcontentloaded');
  }

  async gotoPatient(): Promise<void> {
    await this.page.goto('/patient/consultations');
    await this.page.waitForLoadState('domcontentloaded');
  }

  async expectPageLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/consultations/);
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  }
}
