package com.rhc.ambulanceservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmergencyCreateRequest {
    @NotBlank
    private String pickupAddress;
    @NotNull
    @DecimalMin("-90.0")
    @DecimalMax("90.0")
    private Double pickupLatitude;
    @NotNull
    @DecimalMin("-180.0")
    @DecimalMax("180.0")
    private Double pickupLongitude;
    private String emergencyDescription;
    private String hospitalName;
    private String hospitalAddress;
}
