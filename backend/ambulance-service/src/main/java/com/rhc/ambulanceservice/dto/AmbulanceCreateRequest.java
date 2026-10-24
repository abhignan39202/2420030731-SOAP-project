package com.rhc.ambulanceservice.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AmbulanceCreateRequest {
    @NotBlank
    private String registrationNumber;
    @NotBlank
    private String vehicleType;
    private Double latitude;
    private Double longitude;
    private Long operatorId;
}
