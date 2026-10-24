package com.rhc.ambulanceservice.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "ambulances")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Ambulance {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String registrationNumber;

    @Column(nullable = false)
    @Builder.Default
    private String vehicleType = "BASIC";

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private AmbulanceStatus status = AmbulanceStatus.AVAILABLE;

    private Double latitude;
    private Double longitude;
    private LocalDateTime lastLocationUpdate;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "operator_id")
    private AmbulanceOperator operator;

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
