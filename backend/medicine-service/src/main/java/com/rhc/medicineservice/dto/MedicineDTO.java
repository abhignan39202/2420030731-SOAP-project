package com.rhc.medicineservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MedicineDTO {
    private Long id;
    private String name;
    private String genericName;
    private String dosageForm;
    private String strength;
    private String description;
    private boolean active;
}
