# Complete Backend API Map

All external client requests route through **API Gateway** on Port `8080`.

## 1. Authentication Service (`/api/auth/**` -> Port 8081)
- `POST /api/auth/register` — Public user registration
- `POST /api/auth/login` — Authenticate & obtain JWT token

## 2. User Service (`/api/users/**` -> Port 8082)
- `GET /api/users/profile` — Fetch current user profile
- `PUT /api/users/profile` — Update patient vitals & profile details

## 3. Doctor Service (`/api/doctors/**` -> Port 8083)
- `GET /api/doctors` — List verified doctors & filter by specialty
- `GET /api/doctors/{id}` — Doctor details & slot availability

## 4. Appointment Service (`/api/appointments/**` -> Port 8084)
- `POST /api/appointments` — Book appointment with slot lock
- `GET /api/appointments/patient` — Get patient appointment list
- `GET /api/appointments/doctor` — Get doctor appointment list
- `PATCH /api/appointments/{id}/status` — Transition appointment status

## 5. Consultation Service (`/api/consultations/**` -> Port 8085)
- `POST /api/consultations` — Create consultation for confirmed appointment
- `GET /api/consultations/{id}` — Get consultation details
- `PATCH /api/consultations/{id}/notes` — Complete consultation notes & diagnosis

## 6. Prescription Service (`/api/prescriptions/**` -> Port 8086)
- `POST /api/prescriptions` — Create draft prescription
- `GET /api/prescriptions/{id}` — Get prescription details
- `POST /api/prescriptions/{id}/items` — Add medication item to prescription
- `PATCH /api/prescriptions/{id}/finalize` — Finalize prescription (Immutable)

## 7. Medicine & Reminder Service (`/api/medicines/**`, `/api/medications/**` -> Port 8087)
- `GET /api/medicines/catalog` — Medicine master catalog
- `POST /api/medications/schedules/generate/{prescriptionId}` — Generate dosage schedule
- `GET /api/medications/reminders/daily` — Get patient's daily dosage reminders
- `PATCH /api/medications/reminders/{id}/status` — Mark reminder TAKEN / SKIPPED
- `GET /api/medications/adherence` — Calculate adherence statistics

## 8. Pharmacy Service (`/api/pharmacy/**` -> Port 8088)
- `GET /api/pharmacy/pharmacies` — List active partner pharmacies
- `POST /api/pharmacy/pharmacies` — Register new pharmacy location
- `GET /api/pharmacy/inventory/{pharmacyId}` — List pharmacy medicine inventory
- `POST /api/pharmacy/inventory/{pharmacyId}` — Add / update stock & price
- `POST /api/pharmacy/orders` — Place order with prescription validation & stock reservation
- `GET /api/pharmacy/orders/{id}` — Get order details
- `GET /api/pharmacy/orders/patient` — List patient's pharmacy orders
- `GET /api/pharmacy/orders/pharmacy/{pharmacyId}` — List pharmacy's incoming orders
- `PATCH /api/pharmacy/orders/{id}/confirm` — Confirm pharmacy order
- `PATCH /api/pharmacy/orders/{id}/preparing` — Set preparing state
- `PATCH /api/pharmacy/orders/{id}/ready` — Set ready for pickup/delivery state
- `PATCH /api/pharmacy/orders/{id}/delivered` — Set delivered state
- `PATCH /api/pharmacy/orders/{id}/cancel` — Cancel order & refund reserved stock

## 9. Emergency Ambulance Service (`/api/emergency/**`, `/api/ambulances/**`, `/api/ambulance/**` -> Port 8089)
- `POST /api/emergency/request` — Request emergency dispatch with Haversine search & lock
- `GET /api/emergency/{id}` — View emergency details & simulated ETA
- `GET /api/emergency/my-active` — Get patient's active emergency
- `GET /api/emergency/history` — Get patient emergency history
- `PATCH /api/emergency/{id}/cancel` — Cancel emergency & release ambulance
- `PATCH /api/emergency/{id}/status` — Operator updates dispatch stage
- `GET /api/ambulance/operator/active` — Operator active assignment
- `GET /api/ambulance/operator/history` — Operator response history
- `POST /api/ambulances` — Register ambulance vehicle
- `GET /api/ambulances/available` — List available ambulance units
- `PATCH /api/ambulances/{id}/location` — Operator updates GPS coordinates
