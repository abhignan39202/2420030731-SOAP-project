import { Page, expect } from '@playwright/test';

/**
 * Page Object Model for the Ambulance Operator Dashboard.
 */
export class AmbulanceDashboardPage {
  constructor(private page: Page) {}

  // ─── Navigation ────────────────────────────────────────────────────────────

  async goto() {
    await this.page.goto('/ambulance');
  }

  async gotoEmergency() {
    await this.page.goto('/ambulance/emergency');
  }

  async gotoHistory() {
    await this.page.goto('/ambulance/history');
  }

  async gotoProfile() {
    await this.page.goto('/ambulance/profile');
  }

  // ─── Assertions ────────────────────────────────────────────────────────────

  async expectDashboardHeading() {
    await expect(this.page.locator('#ambulance-dashboard-heading')).toBeVisible();
  }

  async expectSidebarVisible() {
    // Sidebar visible on desktop
    await expect(this.page.getByRole('navigation').first()).toBeVisible();
  }

  async expectActiveBadge() {
    // Active Assignment card
    await expect(this.page.getByText('Active Assignment')).toBeVisible();
  }

  async expectStandbyState() {
    await expect(this.page.getByText('Ambulance Unit Standby')).toBeVisible();
  }

  async expectEmergencyTimeline() {
    await expect(this.page.getByText('Emergency Timeline')).toBeVisible();
  }

  async expectConfirmModal() {
    await expect(this.page.getByText('Confirm Status Change')).toBeVisible();
  }

  async expectHistoryList() {
    await expect(this.page.getByText('Emergency History')).toBeVisible();
  }

  async expectProfilePage() {
    await expect(this.page.getByText('Operator Profile')).toBeVisible();
  }

  // ─── Actions ──────────────────────────────────────────────────────────────

  async clickSidebarLink(label: string) {
    await this.page.getByRole('link', { name: label }).first().click();
  }

  async clickFilter(label: string) {
    await this.page.getByRole('button', { name: label }).first().click();
  }

  async signOut() {
    await this.page.getByRole('button', { name: /sign out/i }).first().click();
  }
}
