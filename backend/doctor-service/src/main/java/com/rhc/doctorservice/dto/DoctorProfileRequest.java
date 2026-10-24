package com.rhc.doctorservice.dto;

import jakarta.validation.constraints.*;
import lombok.*;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class DoctorProfileRequest {
    @NotBlank
    private String fullName;
    
    @NotBlank
    private String specialization;
    
    private String qualification;
    
    @Min(0)
    private Integer yearsOfExperience;
    
    private String consultationDetails;
}
