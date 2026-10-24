package com.rhc.ambulanceservice.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "emergency_assignments")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmergencyAssignment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "emergency_request_id", nullable = false)
    @ToString.Exclude
    private EmergencyRequest emergencyRequest;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "ambulance_id", nullable = false)
    private Ambulance ambulance;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "operator_id", nullable = false)
    private AmbulanceOperator operator;

    private LocalDateTime assignedAt;
    private LocalDateTime acceptedAt;
    private LocalDateTime completedAt;

    @Column(name = "distance_km")
    private Double distanceKm;

    @PrePersist
    protected void onCreate() {
        assignedAt = LocalDateTime.now();
    }
}
