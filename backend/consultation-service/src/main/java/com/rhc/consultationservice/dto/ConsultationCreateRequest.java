package com.rhc.consultationservice.dto;

import jakarta.validation.constraints.NotNull;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConsultationCreateRequest {

    @NotNull(message = "Appointment ID is required")
    private Long appointmentId;

    private String symptoms;
}
