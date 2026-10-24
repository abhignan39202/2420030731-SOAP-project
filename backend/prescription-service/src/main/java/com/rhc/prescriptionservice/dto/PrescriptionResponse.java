package com.rhc.prescriptionservice.dto;

import com.rhc.prescriptionservice.entity.PrescriptionStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PrescriptionResponse {
    private Long id;
    private Long consultationId;
    private Long patientId;
    private Long doctorId;
    private String patientName; // Can be populated if needed, for now might be null if not fetched
    private String doctorName;  // Can be populated if needed, for now might be null if not fetched
    private PrescriptionStatus status;
    private String diagnosis;
    private String generalInstructions;
    private LocalDateTime issuedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<PrescriptionItemResponse> items;
    private Long version;
}
