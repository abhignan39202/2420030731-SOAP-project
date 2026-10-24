# Event Catalog & Event-Driven Architecture

## Event Overview
Rural Health Companion uses asynchronous event-driven notifications for state transitions across clinical, pharmacy, and emergency domains.

| Event Type | Topic | Producer | Consumer(s) | Payload Summary | Idempotency Key |
|---|---|---|---|---|---|
| `PrescriptionFinalized` | `prescription.finalized` | `prescription-service` | `medicine-service`, `notification-service` | `prescriptionId`, `patientId`, `doctorId`, `timestamp` | `prescriptionId` |
| `MedicineReminderDue` | `medicine.reminder.due` | `medicine-service` | `notification-service` | `reminderId`, `patientId`, `medicineName`, `dueTime` | `reminderId` |
| `OrderCreated` | `pharmacy.order.created` | `pharmacy-service` | `notification-service` | `orderId`, `patientId`, `pharmacyId`, `totalAmount` | `orderId` |
| `OrderConfirmed` | `pharmacy.order.confirmed` | `pharmacy-service` | `notification-service` | `orderId`, `patientId`, `pharmacyId`, `status` | `orderId` + `status` |
| `OrderDelivered` | `pharmacy.order.delivered` | `pharmacy-service` | `notification-service` | `orderId`, `patientId`, `status`, `deliveredAt` | `orderId` + `status` |
| `EmergencyCreated` | `emergency.created` | `ambulance-service` | `notification-service` | `emergencyId`, `patientId`, `pickupAddress` | `emergencyId` |
| `AmbulanceAssigned` | `ambulance.assigned` | `ambulance-service` | `notification-service` | `emergencyId`, `ambulanceId`, `operatorId` | `emergencyId` + `ambulanceId` |
| `EmergencyStatusChanged` | `emergency.status.changed` | `ambulance-service` | `notification-service` | `emergencyId`, `status`, `updatedAt` | `emergencyId` + `status` |
| `EmergencyCompleted` | `emergency.completed` | `ambulance-service` | `notification-service` | `emergencyId`, `completedAt` | `emergencyId` + `status` |

---

## Event Schema Structure

### Standard Envelope Schema (v1)
```json
{
  "eventId": "evt_9876543210",
  "eventType": "PrescriptionFinalized",
  "timestamp": "2026-08-13T20:45:00Z",
  "source": "prescription-service",
  "version": 1,
  "data": {
    "prescriptionId": 50,
    "patientId": 100,
    "doctorId": 200
  }
}
```

---

## Idempotency & Failure Handling Strategy
1. **Idempotency Keying**: Consumers track `eventId` or business key (e.g. `prescriptionId`) in database unique constraints.
2. **Duplicate Protection**: Processing a duplicate event yields a no-op response (`200 OK` or silent skip) without duplicating downstream entities (e.g., duplicate schedule rows).
3. **Dead Letter Queue (DLQ)**: Malformed events that fail deserialization are routed to `{topic}.DLQ` for inspection rather than causing infinite consumer loop retries.
