package com.rhc.consultationservice.dto;

import com.rhc.consultationservice.entity.ConsultationStatus;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConsultationResponse {

    private Long id;
    private Long appointmentId;
    private Long patientId;
    private Long doctorId;
    private String symptoms;
    private String clinicalNotes;
    private String diagnosis;
    private String followUpInstructions;
    private LocalDate followUpDate;
    private ConsultationStatus status;
    private LocalDateTime startedAt;
    private LocalDateTime completedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    private String doctorName;
    private String patientName;
}
