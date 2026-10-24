package com.rhc.pharmacyservice.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "pharmacies")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Pharmacy {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Auth service user ID for the pharmacy account that owns this location. */
    @Column(name = "owner_user_id", unique = true)
    private Long ownerUserId;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String licenseNumber;

    private String address;
    private String phone;
    private String email;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private PharmacyStatus status = PharmacyStatus.ACTIVE;

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
