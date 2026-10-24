package com.rhc.pharmacyservice.dto;

import lombok.*;
import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InventoryResponse {
    private Long id;
    private Long pharmacyId;
    private Long medicineId;
    private String medicineName;
    private Integer availableQuantity;
    private Integer reservedQuantity;
    private BigDecimal price;
    private boolean active;
}
