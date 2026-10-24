package com.rhc.prescriptionservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

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
    private String diagnosis;
    private String status;
    private LocalDateTime createdAt;
}
