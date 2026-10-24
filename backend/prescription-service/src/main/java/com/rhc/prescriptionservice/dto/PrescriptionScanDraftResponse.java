package com.rhc.prescriptionservice.dto;

import com.rhc.prescriptionservice.entity.ScanDraftStatus;
import lombok.Builder;
import lombok.Getter;
import java.time.LocalDateTime;

@Getter @Builder
public class PrescriptionScanDraftResponse {
    private Long id;
    private Long patientId;
    private String reviewedText;
    private ScanDraftStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
