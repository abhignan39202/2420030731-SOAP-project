# Backend Architecture & Service Ownership Document

## Overview
The **Rural Health Companion** backend is structured as an event-driven microservices architecture built with Java 21, Spring Boot 3.4.2, Spring Cloud 2024.0.0, Netflix Eureka Server, and Spring Cloud API Gateway.

```
                              [ Next.js 16 Web Client ]
                                          │
                                          ▼
                             [ API Gateway (Port 8080) ]
                                          │
    ┌─────────────┬─────────────┬─────────┴───┬─────────────┬─────────────┬─────────────┐
    ▼             ▼             ▼             ▼             ▼             ▼             ▼
[Auth Service] [User Service] [Doctor Svc] [Appt Svc] [Consult Svc] [Prescr Svc] [Med/Pharm/Amb]
 (8081)         (8082)         (8083)       (8084)       (8085)        (8086)     (8087/8088/8089)
    │             │             │            │            │             │             │
    ▼             ▼             ▼            ▼            ▼             ▼             ▼
 rhc_auth     rhc_users     rhc_doctors rhc_appts   rhc_consult   rhc_prescr   rhc_med/pharm/amb
```

---

## Service Ownership & Database Boundaries

Each microservice strictly owns its dedicated MySQL database schema. Cross-service database access via direct JDBC is prohibited. Inter-service interaction occurs via OpenFeign REST clients or asynchronous Kafka events.

| Microservice | Port | Primary Database | Key Responsibilities | Cross-Service Interacts With |
|---|---|---|---|---|
| `eureka-server` | 8761 | N/A | Service Registration & Discovery | All Microservices |
| `api-gateway` | 8080 | N/A | Centralized Routing, CORS, JWT Relay | All Microservices |
| `auth-service` | 8081 | `rhc_auth` | User Registration, Authentication, JWT Issue | None |
| `user-service` | 8082 | `rhc_users` | Patient Profiles, Vitals, Health History | Auth Service |
| `doctor-service` | 8083 | `rhc_doctors` | Doctor Verification, Specialty, Slot Availability | User Service |
| `appointment-service` | 8084 | `rhc_appointments` | Booking, Slot Locking, Status Lifecycle | Doctor Service, User Service |
| `consultation-service` | 8085 | `rhc_consultations` | Symptom Entry, Consultation Notes, Audio/Video | Appointment Service |
| `prescription-service` | 8086 | `rhc_prescriptions` | Immutable Finalized Prescriptions | Consultation Service |
| `medicine-service` | 8087 | `rhc_medicines` | Medication Schedules, Daily Dose Reminders | Prescription Service |
| `pharmacy-service` | 8088 | `rhc_pharmacy` | Pharmacy Inventory, Stock Reservation, Orders | Prescription Service |
| `ambulance-service` | 8089 | `rhc_ambulance` | Emergency Dispatch, Haversine Search, Lock | User Service |

---

## Resilience & Cross-Service Patterns

1. **Authentication Relay**: API Gateway validates JWT and forwards claims (`X-User-Id`, `X-User-Roles`) to downstream microservices.
2. **Pessimistic Concurrency Locking**:
   - `appointment-service`: Prevents double-booking doctor slots.
   - `pharmacy-service`: Prevents inventory overbooking.
   - `ambulance-service`: Prevents concurrent ambulance double-assignment.
3. **Standardized Error Structure**: All microservices handle exceptions with `GlobalExceptionHandler` returning consistent JSON errors (`status`, `error`, `message`, `timestamp`).
