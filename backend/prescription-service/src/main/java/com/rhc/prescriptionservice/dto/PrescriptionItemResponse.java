package com.rhc.prescriptionservice.dto;

import com.rhc.prescriptionservice.entity.DurationUnit;
import com.rhc.prescriptionservice.entity.Frequency;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PrescriptionItemResponse {
    private Long id;
    private Long prescriptionId;
    private String medicineName;
    private String dosageValue;
    private String dosageUnit;
    private Frequency frequency;
    private Integer durationValue;
    private DurationUnit durationUnit;
    private String route;
    private String instructions;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
