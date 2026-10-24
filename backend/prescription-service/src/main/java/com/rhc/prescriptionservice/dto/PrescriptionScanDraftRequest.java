package com.rhc.prescriptionservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class PrescriptionScanDraftRequest {
    @NotBlank
    @Size(max = 20000, message = "Reviewed prescription text must be 20,000 characters or fewer")
    private String reviewedText;
}
