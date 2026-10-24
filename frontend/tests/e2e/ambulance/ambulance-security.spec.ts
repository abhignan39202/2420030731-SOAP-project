import { test, expect } from '../../fixtures/auth';

/**
 * Ambulance Security & Isolation Tests
 * Verifies that unauthorized roles (Patient, Doctor, Pharmacy) are blocked from accessing /ambulance.
 */

test.describe('Ambulance Security & Isolation', () => {

  test('Patient role is blocked from /ambulance', async ({ patientPage }) => {
    await patientPage.goto('/ambulance');
    // Should show Access Restricted UI or redirect
    await expect(patientPage.getByText('Access Restricted')).toBeVisible();
  });

  test('Doctor role is blocked from /ambulance', async ({ doctorPage }) => {
    await doctorPage.goto('/ambulance');
    await expect(doctorPage.getByText('Access Restricted')).toBeVisible();
  });

  test('Pharmacy role is blocked from /ambulance', async ({ pharmacyPage }) => {
    await pharmacyPage.goto('/ambulance');
    await expect(pharmacyPage.getByText('Access Restricted')).toBeVisible();
  });

});
