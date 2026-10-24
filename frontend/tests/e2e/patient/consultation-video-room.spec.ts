import { test, expect } from '../../fixtures/auth';

test.describe('Consultation video room controls', () => {
  test('authenticates, joins, toggles media, and leaves the signaling room', async ({ patientPage }) => {
    await patientPage.addInitScript(() => {
      Object.defineProperty(navigator, 'mediaDevices', {
        configurable: true,
        value: { getUserMedia: async () => new MediaStream() },
      });
    });

    await patientPage.route('**/api/consultations/42', (route) => route.fulfill({
      json: {
        id: 42,
        appointmentId: 12,
        patientId: 100,
        doctorId: 7,
        doctorName: 'Dr Rao',
        symptoms: 'Fever',
        status: 'IN_PROGRESS',
        startedAt: '2026-09-23T10:00:00',
        createdAt: '2026-09-23T09:45:00',
      },
    }));

    const signalingMessages: Array<Record<string, unknown>> = [];
    await patientPage.routeWebSocket(/\/ws\/consultations$/, (socket) => {
      socket.onMessage((rawMessage) => {
        const message = JSON.parse(String(rawMessage)) as Record<string, unknown>;
        signalingMessages.push(message);
        if (message.type === 'AUTHENTICATE') {
          socket.send(JSON.stringify({ type: 'AUTHENTICATED', userId: 100 }));
        } else if (message.type === 'JOIN') {
          socket.send(JSON.stringify({
            type: 'JOINED',
            consultationId: 42,
            role: 'PATIENT',
            consultationStatus: 'IN_PROGRESS',
            participants: [],
          }));
        } else if (message.type === 'SYNC_STATE') {
          socket.send(JSON.stringify({ type: 'ROOM_STATE', consultationId: 42, consultationStatus: 'IN_PROGRESS' }));
        }
      });
    });

    await patientPage.goto('/patient/consultations/42');
    await expect(patientPage.getByRole('heading', { name: 'Virtual Consultation Room #42' })).toBeVisible();
    await patientPage.getByRole('button', { name: 'Join video visit' }).click();
    await expect(patientPage.getByText('Waiting for the other participant…')).toBeVisible();

    await patientPage.getByRole('button', { name: 'Mute microphone' }).click();
    await patientPage.getByRole('button', { name: 'Turn camera off' }).click();
    await expect(patientPage.getByRole('button', { name: 'Turn microphone on' })).toHaveAttribute('aria-pressed', 'false');
    await expect(patientPage.getByRole('button', { name: 'Turn camera on' })).toHaveAttribute('aria-pressed', 'false');

    await patientPage.getByRole('button', { name: 'Leave' }).click();
    await expect(patientPage.getByText('Not joined')).toBeVisible();
    expect(signalingMessages.map((message) => message.type)).toEqual(
      expect.arrayContaining(['AUTHENTICATE', 'JOIN', 'MEDIA_STATE', 'SYNC_STATE', 'LEAVE']),
    );
    expect(signalingMessages.some((message) => message.cameraEnabled === false && message.microphoneEnabled === false)).toBe(true);
  });
});
