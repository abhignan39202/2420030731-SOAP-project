package com.rhc.prescriptionservice.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "prescription_items")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PrescriptionItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "prescription_id", nullable = false)
    @JsonIgnore
    @ToString.Exclude
    private Prescription prescription;

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

    private String route;

    @Column(columnDefinition = "TEXT")
    private String instructions;

    @Column(updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
