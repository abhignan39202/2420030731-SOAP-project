import { test, expect } from '../../fixtures/auth';
import { mockApiTimeout } from '../../utils/test-helpers';

test.describe('Network Error Handling Tests', () => {
  test('gracefully handles network timeout on API request', async ({ patientPage }) => {
    await mockApiTimeout(patientPage, '**/api/consultations**');
    await patientPage.goto('/patient/consultations');

    // Page shell should render gracefully
    await expect(patientPage.getByText(/rural health/i).first()).toBeVisible();
  });
});
