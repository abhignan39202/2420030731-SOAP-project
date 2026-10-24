package com.rhc.medicineservice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
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
    private String instructions;
}
