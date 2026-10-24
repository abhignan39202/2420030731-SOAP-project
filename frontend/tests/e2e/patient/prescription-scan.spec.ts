import { test, expect } from '../../fixtures/auth';

const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/f9sAAAAASUVORK5CYII=',
  'base64'
);

test.describe('Patient prescription scan review', () => {
  test('scans a valid image, lets patient correct OCR text, and confirms only a draft', async ({ patientPage }) => {
    await patientPage.route('**/api/prescriptions/scan/ocr', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ extractedText: 'OCR medicine name: Paracetmol\n500 mg' }) });
    });
    await patientPage.route('**/api/prescriptions/scan/drafts', async (route) => {
      const payload = route.request().postDataJSON();
      expect(payload.reviewedText).toContain('Paracetamol');
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: 77, status: 'DRAFT' }) });
    });

    await patientPage.goto('/patient/prescriptions/scan');
    await patientPage.getByLabel('Choose prescription image').setInputFiles({ name: 'prescription.png', mimeType: 'image/png', buffer: png });

    await expect(patientPage.getByText('Please verify extracted prescription information before continuing.')).toBeVisible();
    const review = patientPage.getByLabel('Review and edit extracted prescription information');
    await expect(review).toHaveValue('OCR medicine name: Paracetmol\n500 mg');
    await review.fill('OCR medicine name: Paracetamol\n500 mg');
    await patientPage.getByRole('button', { name: 'Confirm and save draft' }).click();

    await expect(patientPage.getByText('Prescription draft saved')).toBeVisible();
    await expect(patientPage.getByText(/not a finalized prescription or medication order/)).toBeVisible();
  });

  test('rejects an invalid file in the browser without calling OCR', async ({ patientPage }) => {
    let ocrCalled = false;
    await patientPage.route('**/api/prescriptions/scan/ocr', async (route) => {
      ocrCalled = true;
      await route.fulfill({ status: 200, body: '{"extractedText":"should not be called"}' });
    });
    await patientPage.goto('/patient/prescriptions/scan');
    await patientPage.getByLabel('Choose prescription image').setInputFiles({ name: 'prescription.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF') });

    await expect(patientPage.getByRole('alert')).toHaveText('Choose a JPEG or PNG image.');
    expect(ocrCalled).toBe(false);
  });

  test('canceling review discards extracted text and creates no draft', async ({ patientPage }) => {
    let draftCreated = false;
    await patientPage.route('**/api/prescriptions/scan/ocr', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ extractedText: 'Prescription text to discard' }) });
    });
    await patientPage.route('**/api/prescriptions/scan/drafts', async (route) => {
      draftCreated = true;
      await route.fulfill({ status: 201, body: '{}' });
    });
    await patientPage.goto('/patient/prescriptions/scan');
    await patientPage.getByLabel('Choose prescription image').setInputFiles({ name: 'prescription.png', mimeType: 'image/png', buffer: png });
    await expect(patientPage.getByLabel('Review and edit extracted prescription information')).toHaveValue('Prescription text to discard');
    await patientPage.getByRole('button', { name: 'Cancel scan' }).click();

    await expect(patientPage.getByLabel('Choose prescription image')).toBeVisible();
    expect(draftCreated).toBe(false);
  });
});
