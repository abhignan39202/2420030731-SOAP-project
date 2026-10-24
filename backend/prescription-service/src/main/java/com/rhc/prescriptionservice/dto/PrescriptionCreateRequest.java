package com.rhc.prescriptionservice.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PrescriptionCreateRequest {
    @NotNull(message = "Consultation ID is required")
    private Long consultationId;

    private String generalInstructions;

    @NotEmpty(message = "Prescription items cannot be empty")
    @Valid
    private List<PrescriptionItemRequest> items;
}
