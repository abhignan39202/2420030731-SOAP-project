package com.rhc.ambulanceservice.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "emergency_requests")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmergencyRequest {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long patientId;

    @Column(nullable = false)
    private String pickupAddress;

    private Double pickupLatitude;
    private Double pickupLongitude;

    @Column(length = 500)
    private String emergencyDescription;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private EmergencyStatus status = EmergencyStatus.REQUESTED;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "assigned_ambulance_id")
    private Ambulance assignedAmbulance;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "assigned_operator_id")
    private AmbulanceOperator assignedOperator;

    private String hospitalName;
    private String hospitalAddress;

    @Column(updatable = false)
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime completedAt;

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
