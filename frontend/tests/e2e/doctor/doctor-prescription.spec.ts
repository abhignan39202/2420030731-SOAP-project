import { test } from '../../fixtures/auth';
import { PrescriptionPage } from '../../pages/PrescriptionPage';

test.describe('Doctor Prescription Creation', () => {
  test('doctor prescriptions page loads correctly', async ({ doctorPage }) => {
    const pageObj = new PrescriptionPage(doctorPage);
    await pageObj.gotoDoctor();
    await pageObj.expectPageLoaded();
  });
});
