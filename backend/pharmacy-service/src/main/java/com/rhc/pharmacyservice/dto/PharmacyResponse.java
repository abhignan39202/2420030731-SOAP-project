package com.rhc.pharmacyservice.dto;

import com.rhc.pharmacyservice.entity.PharmacyStatus;
import lombok.*;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PharmacyResponse {
    private Long id;
    private String name;
    private String licenseNumber;
    private String address;
    private String phone;
    private String email;
    private PharmacyStatus status;
    private LocalDateTime createdAt;
}
