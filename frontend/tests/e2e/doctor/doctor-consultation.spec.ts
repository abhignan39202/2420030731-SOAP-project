import { test } from '../../fixtures/auth';
import { ConsultationPage } from '../../pages/ConsultationPage';

test.describe('Doctor Consultation Workflow', () => {
  test('doctor consultation portal page loads correctly', async ({ doctorPage }) => {
    const pageObj = new ConsultationPage(doctorPage);
    await pageObj.gotoDoctor();
    await pageObj.expectPageLoaded();
  });
});
