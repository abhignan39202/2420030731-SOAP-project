package com.rhc.notificationservice.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "notifications", uniqueConstraints = @UniqueConstraint(name = "uk_notification_event_id", columnNames = "event_id"))
@Getter
@Setter
@NoArgsConstructor
public class NotificationRecord {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "event_id", nullable = false, unique = true, length = 160)
    private String eventId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "event_type", nullable = false, length = 80)
    private String eventType;

    @Column(nullable = false, length = 160)
    private String title;

    @Column(nullable = false, length = 1000)
    private String body;

    @Lob
    @Column(name = "data_json")
    private String dataJson;

    @Column(name = "scheduled_at")
    private LocalDateTime scheduledAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private NotificationStatus status;

    @Column(nullable = false)
    private int attempts;

    @Column(name = "next_attempt_at")
    private LocalDateTime nextAttemptAt;

    @Column(name = "last_error", length = 1000)
    private String lastError;

    @Column(name = "sent_at")
    private LocalDateTime sentAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void beforeInsert() {
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void beforeUpdate() { updatedAt = LocalDateTime.now(); }
}
