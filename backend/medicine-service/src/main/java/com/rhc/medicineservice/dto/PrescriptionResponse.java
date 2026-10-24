package com.rhc.medicineservice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PrescriptionResponse {
    private Long id;
    private Long consultationId;
    private Long doctorId;
    private Long patientId;
    private String status; // DRAFT, FINALIZED, CANCELLED
    private String diagnosis;
    private String notes;
    private LocalDateTime issuedAt;
    private LocalDateTime validUntil;
    private List<PrescriptionItemResponse> items;
}
