package com.rhc.userservice.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "patient_profiles")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PatientProfile {
    @Id
    private Long userId; // Shared ID from Auth Service

    @Column(nullable = false)
    private String fullName;

    private String phoneNumber;
    private String address;
    private String ruralLocation;
    private String bloodGroup;
    private String gender;
    private java.time.LocalDate dateOfBirth;
    
    @Column(columnDefinition = "TEXT")
    private String allergies;

    @Column(columnDefinition = "TEXT")
    private String medicalHistory;
    
    @Column(columnDefinition = "TEXT")
    private String emergencyContactDetails;

    @Version
    private Long version;
}
