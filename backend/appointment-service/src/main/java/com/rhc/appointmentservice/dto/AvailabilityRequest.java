package com.rhc.appointmentservice.dto;

import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AvailabilityRequest {

    @NotNull(message = "Doctor ID is required")
    private Long doctorId;

    private DayOfWeek dayOfWeek;

    private LocalDate specificDate;

    @NotNull(message = "Start time is required")
    private LocalTime startTime;

    @NotNull(message = "End time is required")
    private LocalTime endTime;
}
