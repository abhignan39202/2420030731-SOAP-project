package com.rhc.doctorservice.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "doctors")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Doctor {
    @Id
    private Long userId; // Shared ID from Auth Service

    @Column(nullable = false)
    private String fullName;

    @Column(nullable = false)
    private String specialization;

    private String qualification;
    private Integer yearsOfExperience;
    
    @Column(columnDefinition = "TEXT")
    private String consultationDetails;

    @Enumerated(EnumType.STRING)
    private VerificationStatus status = VerificationStatus.PENDING_VERIFICATION;

    private boolean isAvailable = true;

    public enum VerificationStatus {
        REGISTERED,
        PENDING_VERIFICATION,
        APPROVED,
        REJECTED
    }
}
