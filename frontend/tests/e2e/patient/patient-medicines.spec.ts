import { test } from '../../fixtures/auth';
import { MedicinePage } from '../../pages/MedicinePage';

test.describe('Patient Daily Medicines', () => {
  test('patient daily medicines page loads and shows daily schedule', async ({ patientPage }) => {
    const pageObj = new MedicinePage(patientPage);
    await pageObj.goto();
    await pageObj.expectPageLoaded();
    await pageObj.expectContentVisible();
  });
});
