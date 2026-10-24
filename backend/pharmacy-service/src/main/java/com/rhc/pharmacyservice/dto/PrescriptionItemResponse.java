package com.rhc.pharmacyservice.dto;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PrescriptionItemResponse {
    private Long id;
    private String medicineName;
    private String dosageValue;
    private String dosageUnit;
    private String frequency;
    private Integer durationValue;
    private String durationUnit;
    private String route;
    private String instructions;
}
