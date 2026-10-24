package com.rhc.appointmentservice.dto;

import lombok.*;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AvailabilityResponse {

    private Long id;
    private Long doctorId;
    private DayOfWeek dayOfWeek;
    private LocalDate specificDate;
    private LocalTime startTime;
    private LocalTime endTime;
    private boolean isAvailable;
}
