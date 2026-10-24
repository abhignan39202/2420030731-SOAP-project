package com.rhc.appointmentservice.dto;

import com.rhc.appointmentservice.entity.AppointmentStatus;
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
    private AppointmentStatus status;
    private String reason;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String doctorName;
    private String patientName;
}
