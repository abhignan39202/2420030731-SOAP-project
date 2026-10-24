import { Page, Locator, expect } from '@playwright/test';

/**
 * DoctorDashboardPage — Page Object Model
 * Covers: /doctor
 */
export class DoctorDashboardPage {
  readonly page: Page;

  readonly dashboardLink: Locator;
  readonly appointmentsLink: Locator;
  readonly patientsLink: Locator;
  readonly consultationsLink: Locator;
  readonly prescriptionsLink: Locator;
  readonly profileLink: Locator;
  readonly logoutButton: Locator;
  readonly doctorPortalLabel: Locator;

  constructor(page: Page) {
    this.page = page;
    // From doctor/layout.tsx NAV_ITEMS
    this.dashboardLink = page.getByRole('link', { name: /dashboard/i }).first();
    this.appointmentsLink = page.getByRole('link', { name: /appointments/i }).first();
    this.patientsLink = page.getByRole('link', { name: /my patients/i }).first();
    this.consultationsLink = page.getByRole('link', { name: /consultations/i }).first();
    this.prescriptionsLink = page.getByRole('link', { name: /prescriptions/i }).first();
    this.profileLink = page.getByRole('link', { name: /my profile/i }).first();
    this.logoutButton = page.getByRole('button', { name: /logout|sign out/i }).first();
    this.doctorPortalLabel = page.getByText(/doctor portal/i).first();
  }

  async goto(): Promise<void> {
    await this.page.goto('/doctor');
    await this.page.waitForLoadState('domcontentloaded');
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/\/doctor/);
    await expect(this.doctorPortalLabel).toBeVisible({ timeout: 10000 });
  }

  async navigateToAppointments(): Promise<void> {
    await this.appointmentsLink.click();
    await expect(this.page).toHaveURL(/\/doctor\/appointments/);
  }

  async navigateToConsultations(): Promise<void> {
    await this.consultationsLink.click();
    await expect(this.page).toHaveURL(/\/doctor\/consultations/);
  }

  async navigateToPrescriptions(): Promise<void> {
    await this.prescriptionsLink.click();
    await expect(this.page).toHaveURL(/\/doctor\/prescriptions/);
  }

  async navigateToPatients(): Promise<void> {
    await this.patientsLink.click();
    await expect(this.page).toHaveURL(/\/doctor\/patients/);
  }

  async logout(): Promise<void> {
    await this.logoutButton.click();
    await expect(this.page).toHaveURL(/\/login/);
  }
}
