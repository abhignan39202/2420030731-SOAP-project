package com.rhc.appointmentservice.dto;

import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RescheduleRequest {

    @NotNull(message = "New appointment date is required")
    @FutureOrPresent(message = "Appointment date cannot be in the past")
    private LocalDate newDate;

    @NotNull(message = "New start time is required")
    private LocalTime newStartTime;

    @NotNull(message = "New end time is required")
    private LocalTime newEndTime;

    private String reason;
}
