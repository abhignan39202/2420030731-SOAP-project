package com.rhc.medicineservice.dto;

import com.rhc.medicineservice.entity.DurationUnit;
import com.rhc.medicineservice.entity.Frequency;
import com.rhc.medicineservice.entity.MedicationStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MedicationResponse {
    private Long id;
    private Long patientId;
    private Long prescriptionId;
    private Long prescriptionItemId;
    private String medicineName;
    private String dosageValue;
    private String dosageUnit;
    private Frequency frequency;
    private Integer durationValue;
    private DurationUnit durationUnit;
    private LocalDate startDate;
    private LocalDate endDate;
    private String instructions;
    private MedicationStatus status;
    private LocalDateTime createdAt;
}
