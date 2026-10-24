import { Page, Locator, expect } from '@playwright/test';

/**
 * AppointmentPage — Page Object Model
 * Covers: /patient/appointments, /doctor/appointments
 */
export class AppointmentPage {
  readonly page: Page;

  readonly appointmentsList: Locator;
  readonly bookButton: Locator;
  readonly statusBadge: Locator;
  readonly emptyState: Locator;

  constructor(page: Page) {
    this.page = page;
    this.appointmentsList = page.locator('[data-testid="appointments-list"], ul, [class*="space-y"]').first();
    this.bookButton = page.getByRole('button', { name: /book|schedule|new appointment/i }).first();
    this.statusBadge = page.locator('[class*="badge"], [class*="status"]').first();
    this.emptyState = page.getByText(/no appointments|no upcoming/i).first();
  }

  async gotoPatient(): Promise<void> {
    await this.page.goto('/patient/appointments');
    await this.page.waitForLoadState('domcontentloaded');
  }

  async gotoDoctor(): Promise<void> {
    await this.page.goto('/doctor/appointments');
    await this.page.waitForLoadState('domcontentloaded');
  }

  async expectPageLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/appointments/);
  }

  async expectAppointmentsVisible(): Promise<void> {
    // Either appointments exist or empty state is shown — both are valid
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    const hasAppointments = await this.appointmentsList.isVisible().catch(() => false);
    const hasEmptyState = await this.emptyState.isVisible().catch(() => false);
    // Page must show something meaningful
    expect(hasAppointments || hasEmptyState).toBeTruthy();
  }
}
