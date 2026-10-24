package com.rhc.prescriptionservice.dto;

import com.rhc.prescriptionservice.entity.DurationUnit;
import com.rhc.prescriptionservice.entity.Frequency;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PrescriptionItemRequest {
    @NotBlank(message = "Medicine name is required")
    private String medicineName;

    @NotBlank(message = "Dosage value is required")
    private String dosageValue;

    @NotBlank(message = "Dosage unit is required")
    private String dosageUnit;

    @NotNull(message = "Frequency is required")
    private Frequency frequency;

    @NotNull(message = "Duration value is required")
    @Min(value = 1, message = "Duration value must be at least 1")
    private Integer durationValue;

    @NotNull(message = "Duration unit is required")
    private DurationUnit durationUnit;

    private String route;
    private String instructions;
}
