package com.rhc.pharmacyservice.dto;

import jakarta.validation.constraints.*;
import lombok.*;
import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InventoryRequest {
    @NotNull
    private Long medicineId;
    @NotBlank
    private String medicineName;
    @NotNull @Min(0)
    private Integer availableQuantity;
    @NotNull
    private BigDecimal price;
}
