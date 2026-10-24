import { test, expect, type Page } from '@playwright/test';

type PortalRole = 'PATIENT' | 'DOCTOR' | 'PHARMACY' | 'AMBULANCE_OPERATOR';

type Credentials = {
  username: string;
  password: string;
};

type AuthIdentity = {
  id: number;
  token: string;
  roles: string[];
};

type ApiResponse<T> = {
  status(): number;
  json(): Promise<T>;
  text(): Promise<string>;
};

const apiBaseUrl = (
  process.env.PLAYWRIGHT_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
).replace(/\/+$/, '');

const requiredEnvironment = [
  'E2E_PATIENT_USERNAME',
  'E2E_PATIENT_PASSWORD',
  'E2E_DOCTOR_USERNAME',
  'E2E_DOCTOR_PASSWORD',
  'E2E_DOCTOR_ID',
  'E2E_PHARMACY_USERNAME',
  'E2E_PHARMACY_PASSWORD',
  'E2E_PHARMACY_ID',
  'E2E_AMBULANCE_USERNAME',
  'E2E_AMBULANCE_PASSWORD',
  'E2E_AMBULANCE_ID',
];

const missingEnvironment = requiredEnvironment.filter((key) => !process.env[key]);

function environmentCredentials(prefix: string): Credentials {
  return {
    username: process.env[`${prefix}_USERNAME`]!,
    password: process.env[`${prefix}_PASSWORD`]!,
  };
}

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

function normalizedMedicineName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

async function loginForWorkflow(
  page: Page,
  credentials: Credentials,
  role: PortalRole,
  portalPath: string,
): Promise<AuthIdentity> {
  // This cross-service journey uses established test accounts and exercises
  // healthcare workflows. The public browser login flow is covered separately
  // with an OTP exchange test; these accounts continue using the legacy API.
  const loginResponse = await page.request.post(`${apiBaseUrl}/api/auth/login`, { data: credentials });
  expect(loginResponse.status(), 'The live Auth Service login must succeed').toBe(200);

  const payload = await loginResponse.json() as {
    id: number;
    token: string;
    username: string;
    roles: string[];
  };
  const roles = (payload.roles || []).map((value) => value.replace(/^ROLE_/, ''));
  expect(roles, `The account must have the ${role} role`).toContain(role);
  expect(payload.token).toBeTruthy();
  expect(Number.isInteger(Number(payload.id))).toBe(true);

  await page.goto('/');
  await page.evaluate((session) => {
    localStorage.setItem('token', session.token);
    localStorage.setItem('user', JSON.stringify({
      id: Number(session.id),
      username: session.username,
      roles: session.roles,
    }));
  }, payload);
  await page.goto(portalPath);
  await expect(page).toHaveURL(new RegExp(`${portalPath.replaceAll('/', '\\/')}(?:$|\\/)`));
  return { id: Number(payload.id), token: payload.token, roles };
}

async function liveJson<T>(response: ApiResponse<T>, expectedStatus = 200): Promise<T> {
  expect(response.status(), `Live API request returned ${await response.text()}`).toBe(expectedStatus);
  return response.json();
}

async function readNotifications(page: Page, token: string) {
  const response = await page.request.get(`${apiBaseUrl}/api/notifications`, {
    headers: authHeaders(token),
  });
  return liveJson<Array<{
    eventType: string;
    data: Record<string, string>;
  }>>(response);
}

function appointmentCard(page: Page, appointmentId: number) {
  return page
    .getByText(`ID: #${appointmentId}`, { exact: true })
    .locator('xpath=ancestor::div[contains(@class,"rounded-3xl")][1]');
}

test.describe('Complete real-service patient workflow', () => {
  test.skip(
    missingEnvironment.length > 0,
    `Requires dedicated real-backend users and IDs in: ${missingEnvironment.join(', ')}. See tests/e2e/README.md.`,
  );

  test('patient, doctor, pharmacy, and ambulance operator complete one persisted care and SOS journey', async ({ browser }) => {
    test.setTimeout(240_000);

    const patientContext = await browser.newContext({
      permissions: ['geolocation'],
      geolocation: { latitude: 17.385, longitude: 78.4867 },
    });
    const doctorContext = await browser.newContext();
    const pharmacyContext = await browser.newContext();
    const ambulanceContext = await browser.newContext();

    const patientPage = await patientContext.newPage();
    const doctorPage = await doctorContext.newPage();
    const pharmacyPage = await pharmacyContext.newPage();
    const ambulancePage = await ambulanceContext.newPage();

    const patientCredentials = environmentCredentials('E2E_PATIENT');
    const doctorCredentials = environmentCredentials('E2E_DOCTOR');
    const pharmacyCredentials = environmentCredentials('E2E_PHARMACY');
    const ambulanceCredentials = environmentCredentials('E2E_AMBULANCE');
    const expectedDoctorId = Number(process.env.E2E_DOCTOR_ID);
    const expectedPharmacyId = Number(process.env.E2E_PHARMACY_ID);
    const expectedAmbulanceOperatorUserId = Number(process.env.E2E_AMBULANCE_ID);
    const runId = `${Date.now()}`;
    const symptoms = `E2E symptoms ${runId}: fever and cough for two days`;
    const diagnosis = `E2E diagnosis ${runId}`;
    const deliveryAddress = `E2E delivery ${runId}, Green Valley`;
    const pickupAddress = `E2E emergency ${runId}, Green Valley clinic`;

    let patient: AuthIdentity | undefined;
    let doctorSetupToken: string | undefined;
    let availabilityId: number | undefined;
    let emergencyId: number | undefined;

    try {
      // PATIENT login and real-data preflight.
      const patientIdentity = await loginForWorkflow(patientPage, patientCredentials, 'PATIENT', '/patient');
      patient = patientIdentity;
      const patientId = patientIdentity.id;

      const doctorProfileResponse = await patientPage.request.get(
        `${apiBaseUrl}/api/doctors/${expectedDoctorId}`,
        { headers: authHeaders(patientIdentity.token) },
      );
      const doctorProfile = await liveJson<{
        userId: number;
        fullName: string;
        status: string;
      }>(doctorProfileResponse);
      expect(doctorProfile.userId).toBe(expectedDoctorId);
      expect(doctorProfile.status).toBe('APPROVED');

      const patientPharmaciesResponse = await patientPage.request.get(
        `${apiBaseUrl}/api/pharmacy/pharmacies`,
        { headers: authHeaders(patientIdentity.token) },
      );
      const pharmacies = await liveJson<Array<{ id: number; name: string; status: string }>>(
        patientPharmaciesResponse,
      );
      const pharmacyRecord = pharmacies.find((entry) => entry.id === expectedPharmacyId);
      expect(pharmacyRecord, `Pharmacy #${expectedPharmacyId} must be an active database record`).toBeTruthy();

      const inventoryResponse = await patientPage.request.get(
        `${apiBaseUrl}/api/pharmacy/inventory/${expectedPharmacyId}`,
        { headers: authHeaders(patientIdentity.token) },
      );
      const inventory = await liveJson<Array<{
        medicineId: number;
        medicineName: string;
        availableQuantity: number;
        active: boolean;
      }>>(inventoryResponse);
      const testMedicine = inventory.find((item) => {
        const stockName = normalizedMedicineName(item.medicineName);
        return item.active && item.availableQuantity > 0 &&
          (stockName.startsWith('paracetamol') || 'paracetamol'.startsWith(stockName));
      });
      expect(
        testMedicine,
        `Pharmacy #${expectedPharmacyId} needs real, active Paracetamol stock for this run`,
      ).toBeTruthy();

      // The doctor account creates a one-date slot through the real scheduling API;
      // the patient still books it through the normal UI.
      const doctorLoginResponse = await patientPage.request.post(`${apiBaseUrl}/api/auth/login`, {
        data: doctorCredentials,
      });
      const doctorLogin = await liveJson<{ id: number; token: string; roles: string[] }>(doctorLoginResponse);
      expect(Number(doctorLogin.id)).toBe(expectedDoctorId);
      expect(doctorLogin.roles.map((role) => role.replace(/^ROLE_/, ''))).toContain('DOCTOR');
      doctorSetupToken = doctorLogin.token;

      const appointmentDateObject = new Date();
      appointmentDateObject.setHours(12, 0, 0, 0);
      appointmentDateObject.setDate(appointmentDateObject.getDate() + 45);
      const appointmentDate = [
        appointmentDateObject.getFullYear(),
        String(appointmentDateObject.getMonth() + 1).padStart(2, '0'),
        String(appointmentDateObject.getDate()).padStart(2, '0'),
      ].join('-');

      const availabilityCreateResponse = await patientPage.request.post(
        `${apiBaseUrl}/api/appointments/availability`,
        {
          headers: authHeaders(doctorSetupToken),
          data: {
            doctorId: expectedDoctorId,
            specificDate: appointmentDate,
            startTime: '10:00:00',
            endTime: '10:30:00',
          },
        },
      );
      const availability = await liveJson<{ id: number }>(availabilityCreateResponse, 201);
      availabilityId = availability.id;

      const doctorsResponsePromise = patientPage.waitForResponse((response) =>
        new URL(response.url()).pathname === '/api/doctors' && response.request().method() === 'GET',
      );
      await patientPage.goto('/patient/doctors');
      const doctorsResponse = await doctorsResponsePromise;
      const doctors = await liveJson<Array<{ userId: number; fullName: string }>>(doctorsResponse);
      const doctorIndex = doctors.findIndex((entry) => entry.userId === expectedDoctorId);
      expect(doctorIndex, 'The configured doctor must be listed by the real Doctors API').toBeGreaterThanOrEqual(0);
      await expect(patientPage.getByRole('heading', { name: /find doctors/i })).toBeVisible();
      await patientPage.getByRole('button', { name: /book appointment/i }).nth(doctorIndex).click();
      const dateSlotsResponsePromise = patientPage.waitForResponse((response) => {
        const url = new URL(response.url());
        return url.pathname === `/api/appointments/availability/${expectedDoctorId}` &&
          url.searchParams.get('date') === appointmentDate && response.request().method() === 'GET';
      });
      await patientPage.locator('input[type="date"]').fill(appointmentDate);
      const dateSlotsResponse = await dateSlotsResponsePromise;
      const slots = await liveJson<Array<{ startTime: string; endTime: string }>>(dateSlotsResponse);
      expect(slots.some((slot) => slot.startTime.startsWith('10:00'))).toBe(true);
      const slotSelect = patientPage.locator('select').last();
      await expect(slotSelect).toBeVisible();
      await slotSelect.selectOption('10:00');
      await patientPage.locator('textarea').last().fill(`General health follow-up ${runId}`);

      const appointmentResponsePromise = patientPage.waitForResponse((response) =>
        new URL(response.url()).pathname === '/api/appointments' && response.request().method() === 'POST',
      );
      await patientPage.getByRole('button', { name: /confirm booking/i }).click();
      const appointmentResponse = await appointmentResponsePromise;
      const appointment = await liveJson<{
        id: number;
        patientId: number;
        doctorId: number;
        status: string;
      }>(appointmentResponse, 201);
      expect(appointment).toMatchObject({ patientId, doctorId: expectedDoctorId, status: 'REQUESTED' });

      // The appointment service requires doctor confirmation before the patient can
      // create a persisted consultation. The assigned doctor confirms it in their UI.
      const doctor = await loginForWorkflow(doctorPage, doctorCredentials, 'DOCTOR', '/doctor');
      expect(doctor.id).toBe(expectedDoctorId);
      const doctorAppointmentsResponsePromise = doctorPage.waitForResponse((response) =>
        new URL(response.url()).pathname === `/api/appointments/doctor/${expectedDoctorId}` &&
        response.request().method() === 'GET',
      );
      await doctorPage.goto('/doctor/appointments');
      const doctorAppointmentsResponse = await doctorAppointmentsResponsePromise;
      const doctorAppointments = await liveJson<Array<{ id: number; status: string }>>(
        doctorAppointmentsResponse,
      );
      expect(doctorAppointments.some((entry) => entry.id === appointment.id)).toBe(true);
      await expect(appointmentCard(doctorPage, appointment.id)).toBeVisible();

      const confirmAppointmentResponsePromise = doctorPage.waitForResponse((response) =>
        new URL(response.url()).pathname === `/api/appointments/${appointment.id}/confirm` &&
        response.request().method() === 'PATCH',
      );
      await appointmentCard(doctorPage, appointment.id).getByRole('button', { name: 'Confirm', exact: true }).click();
      const confirmAppointmentResponse = await confirmAppointmentResponsePromise;
      expect((await liveJson<{ status: string }>(confirmAppointmentResponse)).status).toBe('CONFIRMED');

      // PATIENT submits symptoms; the actual consultation row is created by the API.
      const patientAppointmentsResponsePromise = patientPage.waitForResponse((response) =>
        new URL(response.url()).pathname === `/api/appointments/patient/${patientId}` &&
        response.request().method() === 'GET',
      );
      await patientPage.goto('/patient/appointments');
      await patientAppointmentsResponsePromise;
      await expect(appointmentCard(patientPage, appointment.id)).toBeVisible();
      await appointmentCard(patientPage, appointment.id).getByRole('link', { name: /submit symptoms/i }).click();
      await expect(patientPage.getByRole('heading', { name: /my virtual consultations/i })).toBeVisible();
      await patientPage.locator('input[type="number"]').fill(String(appointment.id));
      await patientPage.getByText('Describe Your Symptoms').locator('xpath=following::textarea[1]').fill(symptoms);

      const consultationCreateResponsePromise = patientPage.waitForResponse((response) =>
        new URL(response.url()).pathname === '/api/consultations' && response.request().method() === 'POST',
      );
      await patientPage.getByRole('button', { name: 'Enter Room' }).click();
      const consultationCreateResponse = await consultationCreateResponsePromise;
      const consultation = await liveJson<{
        id: number;
        appointmentId: number;
        patientId: number;
        doctorId: number;
        symptoms: string;
        status: string;
      }>(consultationCreateResponse, 201);
      expect(consultation).toMatchObject({
        appointmentId: appointment.id,
        patientId,
        doctorId: expectedDoctorId,
        symptoms,
        status: 'SCHEDULED',
      });

      // DOCTOR sees the same persisted appointment and symptom report.
      const doctorConsultationsResponsePromise = doctorPage.waitForResponse((response) =>
        new URL(response.url()).pathname === `/api/consultations/doctor/${expectedDoctorId}` &&
        response.request().method() === 'GET',
      );
      await doctorPage.goto('/doctor/consultations');
      const doctorConsultationsResponse = await doctorConsultationsResponsePromise;
      const doctorConsultations = await liveJson<Array<{ id: number; appointmentId: number; symptoms: string }>>(
        doctorConsultationsResponse,
      );
      expect(doctorConsultations).toContainEqual(expect.objectContaining({
        id: consultation.id,
        appointmentId: appointment.id,
        symptoms,
      }));
      await expect(doctorPage.getByText(symptoms, { exact: true })).toBeVisible();
      const consultationCard = doctorPage.getByText(symptoms, { exact: true })
        .locator('xpath=ancestor::div[contains(@class,"rounded-3xl")][1]');
      await consultationCard.getByRole('link', { name: /start consultation/i }).click();

      const startConsultationResponsePromise = doctorPage.waitForResponse((response) =>
        new URL(response.url()).pathname === `/api/consultations/${consultation.id}/start` &&
        response.request().method() === 'PATCH',
      );
      await doctorPage.getByRole('button', { name: /start consultation/i }).click();
      expect((await liveJson<{ status: string }>(await startConsultationResponsePromise)).status).toBe('IN_PROGRESS');
      await doctorPage.getByPlaceholder(/acute viral bronchitis/i).fill(diagnosis);
      await doctorPage.getByPlaceholder(/vitals \(bp, pulse/i).fill(`E2E clinical notes ${runId}`);
      await doctorPage.getByPlaceholder(/dietary advice, rest recommendations/i).fill('Rest, fluids, and follow-up if symptoms persist.');

      const notesUpdateResponsePromise = doctorPage.waitForResponse((response) =>
        new URL(response.url()).pathname === `/api/consultations/${consultation.id}/update` &&
        response.request().method() === 'PATCH',
      );
      await doctorPage.getByRole('button', { name: /save draft notes/i }).click();
      expect((await liveJson<{ diagnosis: string }>(await notesUpdateResponsePromise)).diagnosis).toBe(diagnosis);

      const completeConsultationResponsePromise = doctorPage.waitForResponse((response) =>
        new URL(response.url()).pathname === `/api/consultations/${consultation.id}/complete` &&
        response.request().method() === 'PATCH',
      );
      doctorPage.once('dialog', (dialog) => dialog.accept());
      await doctorPage.getByRole('button', { name: /finalize & complete consultation/i }).click();
      expect((await liveJson<{ status: string }>(await completeConsultationResponsePromise)).status).toBe('COMPLETED');

      // DOCTOR finalizes a real prescription; the backend creates the medication schedule.
      const completedConsultationsResponsePromise = doctorPage.waitForResponse((response) =>
        new URL(response.url()).pathname === `/api/consultations/doctor/${expectedDoctorId}` &&
        response.request().method() === 'GET',
      );
      await doctorPage.goto(`/doctor/prescriptions/new?consultationId=${consultation.id}`);
      await completedConsultationsResponsePromise;
      await doctorPage.locator('select').first().selectOption(String(consultation.id));
      await doctorPage.getByPlaceholder(/paracetamol \/ amoxicillin/i).fill('Paracetamol');
      await doctorPage.getByPlaceholder('e.g. 500').fill('500');
      await doctorPage.locator('select').nth(1).selectOption('mg');
      await doctorPage.locator('select').nth(2).selectOption('THREE_TIMES_DAILY');
      await doctorPage.locator('input[type="number"]').fill('1');
      await doctorPage.locator('select').nth(3).selectOption('DAYS');
      await doctorPage.getByPlaceholder(/take after food with warm water/i).fill('Take after food.');

      const prescriptionCreateResponsePromise = doctorPage.waitForResponse((response) =>
        new URL(response.url()).pathname === '/api/prescriptions' && response.request().method() === 'POST',
      );
      const prescriptionFinalizeResponsePromise = doctorPage.waitForResponse((response) =>
        /^\/api\/prescriptions\/\d+\/finalize$/.test(new URL(response.url()).pathname) &&
        response.request().method() === 'PATCH',
      );
      await doctorPage.getByRole('button', { name: /finalize & issue prescription/i }).click();
      const prescriptionCreateResponse = await prescriptionCreateResponsePromise;
      const draftPrescription = await liveJson<{ id: number }>(prescriptionCreateResponse, 201);
      const prescriptionFinalizeResponse = await prescriptionFinalizeResponsePromise;
      const finalizedPrescription = await liveJson<{
        id: number;
        consultationId: number;
        patientId: number;
        status: string;
        items: Array<{ medicineName: string; frequency: string }>;
      }>(prescriptionFinalizeResponse);
      expect(finalizedPrescription).toMatchObject({
        id: draftPrescription.id,
        consultationId: consultation.id,
        patientId,
        status: 'FINALIZED',
      });
      expect(finalizedPrescription.items).toContainEqual(expect.objectContaining({
        medicineName: 'Paracetamol',
        frequency: 'THREE_TIMES_DAILY',
      }));

      // PATIENT sees the finalized prescription and the schedule persisted by Medicine Service.
      await patientPage.goto(`/patient/prescriptions/${finalizedPrescription.id}`);
      await expect(patientPage.getByText(/finalized/i).first()).toBeVisible();
      await expect(patientPage.getByText('Paracetamol', { exact: false })).toBeVisible();

      const remindersResponse = await patientPage.request.get(`${apiBaseUrl}/api/medicines/reminders`, {
        headers: authHeaders(patientIdentity.token),
      });
      const reminders = await liveJson<Array<{
        id: number;
        prescriptionId: number;
        medicineName: string;
        frequency: string;
        status: string;
      }>>(remindersResponse);
      const prescriptionReminders = reminders.filter((reminder) => reminder.prescriptionId === finalizedPrescription.id);
      expect(prescriptionReminders).toHaveLength(3);
      expect(prescriptionReminders.every((reminder) => reminder.medicineName === 'Paracetamol')).toBe(true);
      expect(prescriptionReminders.every((reminder) => reminder.frequency === 'THREE_TIMES_DAILY')).toBe(true);
      await patientPage.goto('/patient/medicines');
      await expect(patientPage.getByRole('heading', { name: /daily medicine reminders & adherence/i })).toBeVisible();
      await patientPage.getByRole('button', { name: /active medications/i }).click();
      await expect(patientPage.getByText('Paracetamol', { exact: true })).toBeVisible();

      // The patient discovers a real listed pharmacy, reserves its real stock, and places an order.
      await patientPage.goto('/patient/orders');
      await expect(patientPage.getByRole('heading', { name: /pharmacy orders/i })).toBeVisible();
      const nearbyPharmaciesResponsePromise = patientPage.waitForResponse((response) =>
        new URL(response.url()).pathname === '/api/pharmacy/nearby' && response.request().method() === 'GET',
      );
      await patientPage.getByRole('button', { name: /use my current location/i }).click();
      const nearbyPharmaciesResponse = await nearbyPharmaciesResponsePromise;
      const nearbyPharmacies = await liveJson<Array<{ name: string }>>(nearbyPharmaciesResponse);
      expect(nearbyPharmacies.length, 'The configured real Maps/Places provider must return nearby pharmacies').toBeGreaterThan(0);
      await expect(patientPage.getByTestId('nearby-result').first()).toBeVisible();
      await patientPage.getByRole('button', { name: /place order from prescription/i }).click();
      const selects = patientPage.locator('form select');
      await selects.nth(0).selectOption(String(finalizedPrescription.id));
      await selects.nth(1).selectOption(String(expectedPharmacyId));
      await expect(selects.nth(2)).toBeEnabled();
      await selects.nth(2).selectOption(String(testMedicine!.medicineId));
      await patientPage.locator('form input[type="number"]').fill('1');
      await patientPage.locator('form textarea').fill(deliveryAddress);

      const createOrderResponsePromise = patientPage.waitForResponse((response) =>
        new URL(response.url()).pathname === '/api/pharmacy/orders' && response.request().method() === 'POST',
      );
      await patientPage.getByRole('button', { name: 'Confirm Order', exact: true }).click();
      const createOrderResponse = await createOrderResponsePromise;
      const order = await liveJson<{
        id: number;
        patientId: number;
        pharmacyId: number;
        prescriptionId: number;
        status: string;
      }>(createOrderResponse, 201);
      expect(order).toMatchObject({
        patientId,
        pharmacyId: expectedPharmacyId,
        prescriptionId: finalizedPrescription.id,
        status: 'PLACED',
      });

      const pharmacyIdentity = await loginForWorkflow(
        pharmacyPage,
        pharmacyCredentials,
        'PHARMACY',
        '/pharmacy',
      );
      // This UI currently routes pharmacy requests by the logged-in pharmacy ID.
      expect(pharmacyIdentity.id).toBe(expectedPharmacyId);
      await pharmacyPage.goto('/pharmacy/orders');
      const pharmacyOrdersResponsePromise = pharmacyPage.waitForResponse((response) =>
        new URL(response.url()).pathname === `/api/pharmacy/orders/pharmacy/${expectedPharmacyId}` &&
        response.request().method() === 'GET',
      );
      const pharmacyOrdersResponse = await pharmacyOrdersResponsePromise;
      const pharmacyOrders = await liveJson<Array<{ id: number; status: string }>>(pharmacyOrdersResponse);
      expect(pharmacyOrders).toContainEqual(expect.objectContaining({ id: order.id, status: 'PLACED' }));
      const pharmacyOrderCard = pharmacyPage.getByText(`Order #${order.id}`, { exact: true })
        .locator('xpath=ancestor::div[contains(@class,"rounded-3xl")][1]');
      await expect(pharmacyOrderCard).toBeVisible();

      const orderTransitions = [
        { button: /accept and process/i, expected: 'PROCESSING' },
        { button: /mark ready/i, expected: 'READY' },
        { button: /dispatch order/i, expected: 'DISPATCHED' },
        { button: /mark delivered/i, expected: 'DELIVERED' },
      ];
      for (const transition of orderTransitions) {
        await pharmacyOrderCard.getByRole('button', { name: transition.button }).click();
        const transitionPromise = pharmacyPage.waitForResponse((response) =>
          new URL(response.url()).pathname.startsWith(`/api/pharmacy/orders/${order.id}/`) &&
          response.request().method() === 'PATCH',
        );
        await pharmacyPage.getByRole('button', { name: 'Confirm Update', exact: true }).click();
        const transitionResponse = await transitionPromise;
        expect((await liveJson<{ status: string }>(transitionResponse)).status).toBe(transition.expected);
        await expect(pharmacyPage.getByText(transition.expected, { exact: true }).first()).toBeVisible();
      }

      await patientPage.goto('/patient/orders');
      await expect(patientPage.getByText(`Order #${order.id}`, { exact: true })).toBeVisible();
      await expect(patientPage.getByText('DELIVERED', { exact: true }).first()).toBeVisible();
      const patientOrdersResponse = await patientPage.request.get(
        `${apiBaseUrl}/api/pharmacy/orders/patient`,
        { headers: authHeaders(patientIdentity.token) },
      );
      const patientOrders = await liveJson<Array<{ id: number; status: string }>>(patientOrdersResponse);
      expect(patientOrders).toContainEqual(expect.objectContaining({ id: order.id, status: 'DELIVERED' }));

      // Manual SOS: browser geolocation is granted to the page; the backend receives and
      // persists those coordinates and performs the real ambulance assignment.
      const activeEmergencyResponse = await patientPage.request.get(
        `${apiBaseUrl}/api/emergency/my-active`,
        { headers: authHeaders(patientIdentity.token) },
      );
      if (activeEmergencyResponse.status() === 200) {
        const priorEmergency = await activeEmergencyResponse.json() as { id: number };
        await patientPage.request.patch(`${apiBaseUrl}/api/emergency/${priorEmergency.id}/cancel`, {
          headers: authHeaders(patientIdentity.token),
        });
      } else {
        expect(activeEmergencyResponse.status()).toBe(204);
      }

      await patientPage.goto('/patient/emergency');
      await patientPage.getByRole('button', { name: /request ambulance now/i }).click();
      await patientPage.getByLabel('Pickup address or nearby landmark').fill(pickupAddress);
      await patientPage.getByLabel('Emergency description / symptoms').fill(`E2E manual SOS ${runId}`);
      await patientPage.getByLabel('Target Hospital').fill('Green Valley District Hospital');
      await patientPage.getByLabel('Hospital Address').fill('District Hospital Road, Green Valley');

      const emergencyCreateResponsePromise = patientPage.waitForResponse((response) =>
        new URL(response.url()).pathname === '/api/emergency/request' && response.request().method() === 'POST',
      );
      await patientPage.getByRole('button', { name: /confirm & request ambulance/i }).click();
      const emergencyCreateResponse = await emergencyCreateResponsePromise;
      const emergency = await liveJson<{
        id: number;
        patientId: number;
        pickupLatitude: number;
        pickupLongitude: number;
        status: string;
        assignedAmbulance?: { id: number };
        assignedOperator?: { userId: number };
      }>(emergencyCreateResponse, 201);
      emergencyId = emergency.id;
      expect(emergency.status).toBe('ASSIGNED');
      expect(emergency.patientId).toBe(patientId);
      expect(emergency.pickupLatitude).toBeCloseTo(17.385, 3);
      expect(emergency.pickupLongitude).toBeCloseTo(78.4867, 3);
      expect(emergency.assignedAmbulance?.id).toBeTruthy();
      expect(emergency.assignedOperator?.userId).toBe(expectedAmbulanceOperatorUserId);

      await expect(patientPage.getByText(`Active Dispatch #${emergency.id}`, { exact: true })).toBeVisible();
      await expect.poll(async () => {
        const notifications = await readNotifications(patientPage, patientIdentity.token);
        return notifications.some((notification) =>
          notification.eventType === 'AMBULANCE_ASSIGNED' &&
          notification.data?.emergencyId === String(emergency.id),
        );
      }, { timeout: 30_000, intervals: [500, 1000, 2000] }).toBe(true);

      const ambulanceOperator = await loginForWorkflow(
        ambulancePage,
        ambulanceCredentials,
        'AMBULANCE_OPERATOR',
        '/ambulance',
      );
      expect(ambulanceOperator.id).toBe(expectedAmbulanceOperatorUserId);
      await ambulancePage.goto('/ambulance/emergency');
      await expect(ambulancePage.getByText(`Emergency #${emergency.id}`, { exact: true })).toBeVisible({ timeout: 30_000 });
      await expect(ambulancePage.getByText(pickupAddress, { exact: true })).toBeVisible();

      const emergencyTransitions = [
        { button: /start en route/i, expected: 'EN_ROUTE' },
        { button: /arrived on scene/i, expected: 'ARRIVED' },
        { button: /patient picked up/i, expected: 'PATIENT_PICKED' },
        { button: /hospital reached/i, expected: 'HOSPITAL_REACHED' },
        { button: /complete emergency/i, expected: 'COMPLETED' },
      ];
      for (const transition of emergencyTransitions) {
        await ambulancePage.getByRole('button', { name: transition.button }).click();
        const transitionPromise = ambulancePage.waitForResponse((response) =>
          new URL(response.url()).pathname === `/api/emergency/${emergency.id}/advance` &&
          response.request().method() === 'PATCH',
        );
        await ambulancePage.getByRole('button', { name: 'Confirm', exact: true }).click();
        const transitionResponse = await transitionPromise;
        expect((await liveJson<{ status: string }>(transitionResponse)).status).toBe(transition.expected);
      }

      const persistedEmergencyResponse = await patientPage.request.get(
        `${apiBaseUrl}/api/emergency/${emergency.id}`,
        { headers: authHeaders(patientIdentity.token) },
      );
      expect((await liveJson<{ status: string }>(persistedEmergencyResponse)).status).toBe('COMPLETED');

      await expect.poll(async () => {
        const notifications = await readNotifications(patientPage, patientIdentity.token);
        return ['AMBULANCE_ASSIGNED', 'AMBULANCE_EN_ROUTE', 'AMBULANCE_ARRIVED', 'PATIENT_PICKED', 'HOSPITAL_REACHED']
          .filter((eventType) => notifications.some((notification) =>
            notification.eventType === eventType && notification.data?.emergencyId === String(emergency.id),
          )).length;
      }, { timeout: 30_000, intervals: [500, 1000, 2000] }).toBe(5);

      await patientPage.goto('/patient/emergency');
      await expect(patientPage.getByText('COMPLETED', { exact: true })).toBeVisible();
    } finally {
      if (patient?.token && emergencyId) {
        const currentEmergency = await patientPage.request.get(
          `${apiBaseUrl}/api/emergency/${emergencyId}`,
          { headers: authHeaders(patient.token) },
        ).catch(() => undefined);
        if (currentEmergency?.status() === 200) {
          const current = await currentEmergency.json() as { status: string };
          if (!['COMPLETED', 'CANCELLED'].includes(current.status)) {
            await patientPage.request.patch(`${apiBaseUrl}/api/emergency/${emergencyId}/cancel`, {
              headers: authHeaders(patient.token),
            }).catch(() => undefined);
          }
        }
      }
      if (availabilityId && doctorSetupToken) {
        await patientPage.request.delete(`${apiBaseUrl}/api/appointments/availability/${availabilityId}`, {
          headers: authHeaders(doctorSetupToken),
        }).catch(() => undefined);
      }
      await Promise.all([
        patientContext.close(),
        doctorContext.close(),
        pharmacyContext.close(),
        ambulanceContext.close(),
      ]);
    }
  });
});
