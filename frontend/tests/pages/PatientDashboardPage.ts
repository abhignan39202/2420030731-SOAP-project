import { Page, Locator, expect } from '@playwright/test';

/**
 * PatientDashboardPage — Page Object Model
 * Covers: /patient
 */
export class PatientDashboardPage {
  readonly page: Page;

  readonly heading: Locator;
  readonly findDoctorsLink: Locator;
  readonly appointmentsLink: Locator;
  readonly prescriptionsLink: Locator;
  readonly medicinesLink: Locator;
  readonly pharmacyLink: Locator;
  readonly emergencyLink: Locator;
  readonly consultationsLink: Locator;
  readonly profileLink: Locator;
  readonly logoutButton: Locator;

  constructor(page: Page) {
    this.page = page;
    // Nav items from patient/layout.tsx
    this.findDoctorsLink = page.getByRole('link', { name: /find doctors/i }).first();
    this.appointmentsLink = page.getByRole('link', { name: /appointments/i }).first();
    this.prescriptionsLink = page.getByRole('link', { name: /prescriptions/i }).first();
    this.medicinesLink = page.getByRole('link', { name: /daily medicines/i }).first();
    this.pharmacyLink = page.getByRole('link', { name: /pharmacy orders/i }).first();
    this.emergencyLink = page.getByRole('link', { name: /emergency/i }).first();
    this.consultationsLink = page.getByRole('link', { name: /consultations/i }).first();
    this.profileLink = page.getByRole('link', { name: /my profile/i }).first();
    this.logoutButton = page.getByRole('button', { name: /logout|sign out/i }).first();
    this.heading = page.getByRole('heading').first();
  }

  async goto(): Promise<void> {
    await this.page.goto('/patient');
    await this.page.waitForLoadState('domcontentloaded');
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/\/patient/);
    await expect(this.findDoctorsLink).toBeVisible({ timeout: 10000 });
  }

  async navigateToAppointments(): Promise<void> {
    await this.appointmentsLink.click();
    await expect(this.page).toHaveURL(/\/patient\/appointments/);
  }

  async navigateToDoctors(): Promise<void> {
    await this.findDoctorsLink.click();
    await expect(this.page).toHaveURL(/\/patient\/doctors/);
  }

  async navigateToPrescriptions(): Promise<void> {
    await this.prescriptionsLink.click();
    await expect(this.page).toHaveURL(/\/patient\/prescriptions/);
  }

  async navigateToMedicines(): Promise<void> {
    await this.medicinesLink.click();
    await expect(this.page).toHaveURL(/\/patient\/medicines/);
  }

  async navigateToPharmacy(): Promise<void> {
    await this.pharmacyLink.click();
    await expect(this.page).toHaveURL(/\/patient\/orders/);
  }

  async navigateToEmergency(): Promise<void> {
    await this.emergencyLink.click();
    await expect(this.page).toHaveURL(/\/patient\/emergency/);
  }

  async logout(): Promise<void> {
    await this.logoutButton.click();
    await expect(this.page).toHaveURL(/\/login/);
  }
}
