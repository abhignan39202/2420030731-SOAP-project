import { Page, Locator, expect } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly codeInput: Locator;
  readonly submitButton: Locator;
  readonly registerLink: Locator;
  readonly heading: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel('Email Address');
    this.codeInput = page.getByLabel('Email verification code');
    this.submitButton = page.getByRole('button', { name: /send sign-in code|verify & sign in/i }).first();
    this.registerLink = page.getByRole('link', { name: /register/i });
    this.heading = page.getByRole('heading', { name: /sign in/i });
  }

  async goto(): Promise<void> {
    await this.page.goto('/login');
    await this.page.waitForLoadState('domcontentloaded');
  }

  async requestCode(email: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.page.getByRole('button', { name: 'Send Sign-In Code' }).click();
  }

  async verifyCode(code: string): Promise<void> {
    await this.codeInput.fill(code);
    await this.page.getByRole('button', { name: 'Verify & Sign In' }).click();
  }

  async expectPageLoaded(): Promise<void> {
    await expect(this.heading).toBeVisible();
    await expect(this.emailInput).toBeVisible();
    await expect(this.submitButton).toBeVisible();
  }
}
