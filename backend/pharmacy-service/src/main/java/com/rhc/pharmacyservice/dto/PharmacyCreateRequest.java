package com.rhc.pharmacyservice.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PharmacyCreateRequest {
    @NotBlank
    private String name;
    @NotBlank
    private String licenseNumber;
    private String address;
    private String phone;
    private String email;
}
