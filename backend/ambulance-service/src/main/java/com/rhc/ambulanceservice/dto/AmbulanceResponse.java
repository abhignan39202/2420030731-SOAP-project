package com.rhc.ambulanceservice.dto;

import com.rhc.ambulanceservice.entity.AmbulanceStatus;
import lombok.*;
import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AmbulanceResponse {
    private Long id;
    private String registrationNumber;
    private String vehicleType;
    private AmbulanceStatus status;
    private Double latitude;
    private Double longitude;
    private Instant lastLocationUpdate;
    private Long operatorId;
    private String operatorName;
}
