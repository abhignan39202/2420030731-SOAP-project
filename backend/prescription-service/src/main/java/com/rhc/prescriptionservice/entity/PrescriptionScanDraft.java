package com.rhc.prescriptionservice.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "prescription_scan_drafts")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PrescriptionScanDraft {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, updatable = false)
    private Long patientId;
    @Column(nullable = false, columnDefinition = "TEXT")
    private String reviewedText;
    @Enumerated(EnumType.STRING) @Column(nullable = false)
    @Builder.Default
    private ScanDraftStatus status = ScanDraftStatus.DRAFT;
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() { createdAt = LocalDateTime.now(); updatedAt = createdAt; }
    @PreUpdate
    protected void onUpdate() { updatedAt = LocalDateTime.now(); }
}
