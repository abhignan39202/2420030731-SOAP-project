package com.rhc.doctorservice.dto;

import lombok.*;
import com.rhc.doctorservice.entity.Doctor.VerificationStatus;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class DoctorProfileResponse {
    private Long userId;
    private String fullName;
    private String specialization;
    private String qualification;
    private Integer yearsOfExperience;
    private String consultationDetails;
    private VerificationStatus status;
    private boolean isAvailable;
}
