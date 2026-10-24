package com.rhc.userservice.dto;

import lombok.*;
import java.time.LocalDate;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class PatientProfileResponse {
    private Long userId;
    private String fullName;
    private String phoneNumber;
    private String address;
    private String ruralLocation;
    private String bloodGroup;
    private String gender;
    private LocalDate dateOfBirth;
    private String allergies;
    private String medicalHistory;
    private String emergencyContactDetails;
}
