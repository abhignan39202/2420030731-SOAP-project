# Real backend Playwright workflow

`npm run test:e2e:workflow` runs the full patient, doctor, pharmacy, and ambulance journey in `regression/complete-service-workflow.spec.ts`. It does not stub frontend requests: login, appointments, consultations, prescriptions, medication schedules, pharmacy stock and orders, emergencies, and notifications all go through the API Gateway to the running services and their configured databases.

Start the MySQL-backed backend stack, Kafka, API Gateway, and Next.js frontend before running it. Set `NEXT_PUBLIC_API_URL` before Next.js starts so the browser uses the Gateway; `PLAYWRIGHT_API_URL` sets the Gateway URL used by direct persisted-state assertions. The Maps/Places provider must be configured and reachable, and it must return at least one nearby result.

Playwright loads the ignored `frontend/.env.test` file automatically when it exists. Shell environment variables take precedence, and login tests skip when their required test credentials are absent.

The workflow needs dedicated test accounts and corresponding database records. Provide these environment variables:

- `E2E_PATIENT_USERNAME`, `E2E_PATIENT_PASSWORD`
- `E2E_DOCTOR_USERNAME`, `E2E_DOCTOR_PASSWORD`, `E2E_DOCTOR_ID`
- `E2E_PHARMACY_USERNAME`, `E2E_PHARMACY_PASSWORD`, `E2E_PHARMACY_ID`
- `E2E_AMBULANCE_USERNAME`, `E2E_AMBULANCE_PASSWORD`, `E2E_AMBULANCE_ID`

The doctor must have an approved profile. The pharmacy must be active, owned by the pharmacy account, and have positive Paracetamol inventory. Its database pharmacy ID must currently match its login user ID because the pharmacy UI uses that ID in its API routes. The ambulance operator ID must match the nearest available unit for the test GPS point (`17.385, 78.4867`).

The test creates one specific-date doctor slot through the authenticated availability API, books it through the patient UI, then deletes the slot. It leaves the completed appointment, consultation, prescription, pharmacy order, and emergency in the test database, and consumes one unit of pharmacy inventory. Use an isolated E2E database and accounts.

If any required E2E variable is missing, Playwright marks this integration test as skipped. The normal smoke and component-oriented browser tests remain separate.
