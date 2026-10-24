package com.rhc.consultationservice.dto;

import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AppointmentResponse {

    private Long id;
    private Long patientId;
    private Long doctorId;
    private LocalDate appointmentDate;
    private LocalTime startTime;
    private LocalTime endTime;
    private String status; // REQUESTED, CONFIRMED, CANCELLED, COMPLETED, NO_SHOW
    private String reason;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
