package com.rhc.notificationservice.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "registered_devices", uniqueConstraints = @UniqueConstraint(
        name = "uk_registered_device_user_identifier", columnNames = {"user_id", "device_identifier"}))
@Getter
@Setter
@NoArgsConstructor
public class RegisteredDevice {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "device_identifier", nullable = false, length = 200)
    private String deviceIdentifier;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private DevicePlatform platform;

    @Column(name = "push_token", nullable = false, length = 4096)
    private String pushToken;

    @Column(nullable = false)
    private boolean active;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "last_seen_at", nullable = false)
    private LocalDateTime lastSeenAt;

    @PrePersist
    void beforeInsert() {
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        lastSeenAt = now;
        active = true;
    }
}
