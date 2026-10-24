package com.rhc.medicineservice.dto;

import com.rhc.medicineservice.entity.Frequency;
import com.rhc.medicineservice.entity.ReminderStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MedicationReminderResponse {
    private Long id;
    private Long medicationId;
    private Long medicineId;
    private Long patientId;
    private Long prescriptionId;
    private String medicineName;
    private String dosage;
    private Frequency frequency;
    private LocalDateTime scheduledAt;
    private LocalDateTime scheduledTime;
    private ReminderStatus status;
    private LocalDateTime takenAt;
    private LocalDateTime acknowledgedAt;
    private String instructions;
}
