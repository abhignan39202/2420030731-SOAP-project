package com.rhc.appointmentservice.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name = "appointments", uniqueConstraints = {
    @UniqueConstraint(name = "uk_doctor_slot", columnNames = {"slotKey"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Appointment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long patientId;

    @Column(nullable = false)
    private Long doctorId;

    @Column(nullable = false)
    private LocalDate appointmentDate;

    @Column(nullable = false)
    private LocalTime startTime;

    @Column(nullable = false)
    private LocalTime endTime;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private AppointmentStatus status = AppointmentStatus.REQUESTED;

    private String reason;

    @Column(name = "slot_key", unique = true)
    private String slotKey;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (status == null) {
            status = AppointmentStatus.REQUESTED;
        }
        updateSlotKey();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
        updateSlotKey();
    }

    public void updateSlotKey() {
        if (status == AppointmentStatus.CANCELLED) {
            this.slotKey = null;
        } else if (doctorId != null && appointmentDate != null && startTime != null) {
            this.slotKey = doctorId + "_" + appointmentDate + "_" + startTime;
        }
    }
}
