import { test, expect } from '../../fixtures/auth';

test.describe('Patient health timeline', () => {
  test('renders persisted healthcare API records in chronological order', async ({ patientPage }) => {
    await patientPage.route('**/api/appointments/patient/100', (route) => route.fulfill({
      json: [{
        id: 4,
        patientId: 100,
        doctorId: 1,
        doctorName: 'Dr Rao',
        appointmentDate: '2026-09-22',
        startTime: '09:30:00',
        status: 'COMPLETED',
        reason: 'Fever and cough',
      }],
    }));
    await patientPage.route('**/api/consultations/patient/100', (route) => route.fulfill({
      json: [{
        id: 7,
        appointmentId: 4,
        patientId: 100,
        doctorId: 1,
        doctorName: 'Dr Rao',
        symptoms: 'Fever and cough',
        diagnosis: 'Acute viral infection',
        followUpInstructions: 'Return if symptoms continue',
        followUpDate: '2026-10-02',
        status: 'COMPLETED',
        startedAt: '2026-09-22T10:00:00',
        completedAt: '2026-09-22T10:30:00',
        createdAt: '2026-09-22T09:35:00',
        updatedAt: '2026-09-22T10:30:00',
      }],
    }));
    await patientPage.route('**/api/prescriptions/patient/100', (route) => route.fulfill({
      json: [{
        id: 3,
        consultationId: 7,
        patientId: 100,
        doctorId: 1,
        doctorName: 'Dr Rao',
        status: 'FINALIZED',
        diagnosis: 'Acute viral infection',
        issuedAt: '2026-09-22T11:00:00',
        createdAt: '2026-09-22T10:45:00',
      }],
    }));
    await patientPage.route('**/api/medicines/history**', (route) => route.fulfill({
      json: [
        {
          id: 21,
          medicineName: 'Paracetamol',
          dosage: '500 mg',
          prescriptionId: 3,
          scheduledAt: '2026-09-22T14:00:00',
          status: 'TAKEN',
          takenAt: '2026-09-22T14:05:00',
          acknowledgedAt: '2026-09-22T14:05:00',
        },
        {
          id: 22,
          medicineName: 'Paracetamol',
          dosage: '500 mg',
          prescriptionId: 3,
          scheduledAt: '2026-09-22T20:00:00',
          status: 'PENDING',
        },
      ],
    }));
    await patientPage.route('**/api/pharmacy/orders/patient', (route) => route.fulfill({
      json: [{
        id: 9,
        patientId: 100,
        pharmacyId: 2,
        pharmacyName: 'Village Pharmacy',
        prescriptionId: 3,
        status: 'DELIVERED',
        createdAt: '2026-09-22T16:00:00',
        deliveredAt: '2026-09-22T17:00:00',
      }],
    }));

    await patientPage.goto('/patient/timeline');
    await expect(patientPage.getByRole('heading', { name: 'Health Timeline' })).toBeVisible();
    const events = patientPage.getByTestId('timeline-event');
    await expect(events).toHaveCount(10);
    await expect(events).toHaveText([
      /Appointment/,
      /Consultation/,
      /Diagnosis/,
      /Prescription issued/,
      /Medication scheduled/,
      /Medication taken/,
      /Pharmacy order/,
      /Order delivered/,
      /Medication scheduled/,
      /Follow-up scheduled/,
    ]);
    await expect(patientPage.getByText(/Acute viral infection/).first()).toBeVisible();
    await expect(patientPage.getByText(/Village Pharmacy/).first()).toBeVisible();
  });
});
