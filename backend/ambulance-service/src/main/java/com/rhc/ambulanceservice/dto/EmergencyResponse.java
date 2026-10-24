package com.rhc.ambulanceservice.dto;

import com.rhc.ambulanceservice.entity.EmergencyStatus;
import lombok.*;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmergencyResponse {
    private Long id;
    private Long patientId;
    private String pickupAddress;
    private Double pickupLatitude;
    private Double pickupLongitude;
    private String emergencyDescription;
    private EmergencyStatus status;
    private Long ambulanceId;
    private Long assignmentId;
    private Double distanceKm;
    private AmbulanceResponse assignedAmbulance;
    private OperatorResponse assignedOperator;
    private String hospitalName;
    private String hospitalAddress;
    private Double estimatedArrivalMinutes;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime completedAt;
}
