package com.rhc.ambulanceservice.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import lombok.*;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LocationUpdateRequest {
    @NotNull
    @DecimalMin("-90.0")
    @DecimalMax("90.0")
    private Double latitude;
    @NotNull
    @DecimalMin("-180.0")
    @DecimalMax("180.0")
    private Double longitude;
    @NotNull
    private Instant timestamp;
}
