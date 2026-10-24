# Rural Health Companion - Service Catalog & Tech Stack Versions

## Technology Stack
- Java: 21
- Spring Boot: 3.4.2
- Spring Cloud: 2024.0.0
- Build System: Apache Maven 3.9+
- Database: MySQL 8.0 (Docker container) / H2 in-memory for testing

## Microservices Architecture & Port Mapping

| Service Name | Port | Database Schema | Description |
|---|---|---|---|
| `eureka-server` | 8761 | N/A | Service Discovery Registry |
| `api-gateway` | 8080 | N/A | Spring Cloud Gateway (Single Entrypoint) |
| `auth-service` | 8081 | `rhc_auth` | Authentication & JWT token issuance |
| `user-service` | 8082 | `rhc_users` | Patient profile management |
| `doctor-service` | 8083 | `rhc_doctors` | Doctor profiles & verifications |
| `appointment-service` | 8084 | `rhc_appointments` | Booking & slot concurrency |
| `consultation-service` | 8085 | `rhc_consultations` | Telemedicine & clinical notes |
| `prescription-service` | 8086 | `rhc_prescriptions` | Official Rx records & itemization |
| `medicine-service` | 8087 | `rhc_medicines` | Medication schedules, reminders & adherence |
| `pharmacy-service` | 8088 | `rhc_pharmacy` | Pharmacy inventory, Rx validation & order fulfillment |

## Frontend Stack
- Node.js: 20+
- Next.js: 16.3.0 (App Router)
- React: 19.2.8
- Tailwind CSS: v4
- TypeScript: 5.x
