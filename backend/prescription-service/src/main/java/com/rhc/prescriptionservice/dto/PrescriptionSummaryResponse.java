package com.rhc.prescriptionservice.dto;

import com.rhc.prescriptionservice.entity.PrescriptionStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PrescriptionSummaryResponse {
    private Long id;
    private Long consultationId;
    private Long patientId;
    private Long doctorId;
    private String doctorName;
    private PrescriptionStatus status;
    private String diagnosis;
    private String generalInstructions;
    private LocalDateTime issuedAt;
    private LocalDateTime createdAt;
    private int itemCount;
}
