package com.rhc.consultationservice.dto;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DoctorProfileResponse {

    private Long userId;
    private String fullName;
    private String specialization;
    private String qualification;
    private Integer yearsOfExperience;
    private String consultationDetails;
    private String status;
    private boolean isAvailable;
}
