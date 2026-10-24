import { test } from '../../fixtures/auth';
import { PrescriptionPage } from '../../pages/PrescriptionPage';

test.describe('Patient Prescriptions', () => {
  test('patient prescriptions page loads correctly', async ({ patientPage }) => {
    const pageObj = new PrescriptionPage(patientPage);
    await pageObj.gotoPatient();
    await pageObj.expectPageLoaded();
  });
});
