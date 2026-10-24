package com.rhc.medicineservice.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "medication_reminders", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"medication_id", "scheduled_time"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MedicationReminder {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "medication_id", nullable = false)
    @JsonIgnore
    private Medication medication;

    @Column(nullable = false)
    private Long patientId;

    @Column(nullable = false)
    private Long prescriptionId;

    @Column(name = "scheduled_time", nullable = false)
    private LocalDateTime scheduledAt;

    /** Domain-friendly alias for the persisted scheduled_time column. */
    @Transient
    public LocalDateTime getScheduledTime() {
        return scheduledAt;
    }

    public void setScheduledTime(LocalDateTime scheduledTime) {
        this.scheduledAt = scheduledTime;
    }

    /** The medication treatment id associated with this scheduled dose. */
    @Column(nullable = false)
    private Long medicineId;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private ReminderStatus status = ReminderStatus.PENDING;

    /** Set only when a patient records TAKEN. */
    private LocalDateTime takenAt;

    /** Kept for backwards-compatible clients; status actions also update it. */
    private LocalDateTime acknowledgedAt;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
