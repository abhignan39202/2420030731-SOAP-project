import { test as base } from '@playwright/test';
import { setPatientAuth, setDoctorAuth } from '../utils/test-helpers';

/**
 * Custom fixtures providing pre-authenticated page contexts.
 *
 * Usage:
 *   import { test } from '../fixtures/auth';
 *   test('my test', async ({ patientPage }) => { ... })
 */

type AuthFixtures = {
  /** A page with patient localStorage already set */
  patientPage: ReturnType<typeof base['extend']> extends { page: infer P } ? P : never;
  /** A page with doctor localStorage already set */
  doctorPage: ReturnType<typeof base['extend']> extends { page: infer P } ? P : never;
  /** A page with pharmacy localStorage already set */
  pharmacyPage: ReturnType<typeof base['extend']> extends { page: infer P } ? P : never;
  /** A page with ambulance operator localStorage already set */
  ambulancePage: ReturnType<typeof base['extend']> extends { page: infer P } ? P : never;
};

export const test = base.extend<{
  patientPage: import('@playwright/test').Page;
  doctorPage: import('@playwright/test').Page;
  pharmacyPage: import('@playwright/test').Page;
  ambulancePage: import('@playwright/test').Page;
}>({
  patientPage: async ({ page }, use) => {
    await setPatientAuth(page);
    await use(page);
  },

  doctorPage: async ({ page }, use) => {
    await setDoctorAuth(page);
    await use(page);
  },

  pharmacyPage: async ({ page }, use) => {
    const { setPharmacyAuth } = await import('../utils/test-helpers');
    await setPharmacyAuth(page);
    await use(page);
  },

  ambulancePage: async ({ page }, use) => {
    const { setAmbulanceOperatorAuth } = await import('../utils/test-helpers');
    await setAmbulanceOperatorAuth(page);
    await use(page);
  },
});

export { expect } from '@playwright/test';
