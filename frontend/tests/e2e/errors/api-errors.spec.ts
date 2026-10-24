import { test, expect } from '../../fixtures/auth';
import { mockApiError } from '../../utils/test-helpers';

test.describe('API Error Handling Tests', () => {
  test('gracefully handles 500 server error from API endpoint without app crash', async ({ patientPage }) => {
    // Intercept backend API call and mock 500 error
    await mockApiError(patientPage, '**/api/**', 500);
    await patientPage.goto('/patient/consultations');

    // App should render UI frame and not crash completely
    await expect(patientPage.getByText(/rural health/i).first()).toBeVisible();
  });
});
