import { test } from '../../fixtures/auth';
import { PharmacyPage } from '../../pages/PharmacyPage';

test.describe('Patient Pharmacy Orders', () => {
  test('patient pharmacy page loads and presents orders interface', async ({ patientPage }) => {
    const pageObj = new PharmacyPage(patientPage);
    await pageObj.goto();
    await pageObj.expectPageLoaded();
    await pageObj.expectContentVisible();
  });
});
