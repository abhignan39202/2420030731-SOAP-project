package com.rhc.medicineservice.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "medications")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Medication {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long patientId;

    @Column(nullable = false)
    private Long prescriptionId;

    @Column(nullable = false, unique = true)
    private Long prescriptionItemId;

    @Column(nullable = false)
    private String medicineName;

    @Column(nullable = false)
    private String dosageValue;

    @Column(nullable = false)
    private String dosageUnit;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Frequency frequency;

    @Column(nullable = false)
    private Integer durationValue;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DurationUnit durationUnit;

    @Column(nullable = false)
    private LocalDate startDate;

    @Column(nullable = false)
    private LocalDate endDate;

    private String instructions;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private MedicationStatus status = MedicationStatus.ACTIVE;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
