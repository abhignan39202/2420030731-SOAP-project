package com.rhc.pharmacyservice.dto;

import jakarta.validation.constraints.*;
import lombok.*;
import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderItemRequest {
    @NotNull
    private Long medicineId;
    @NotBlank
    private String medicineName;
    @NotNull @Min(1)
    private Integer quantity;
    // Accepted for older clients; the service always prices from pharmacy inventory.
    private BigDecimal unitPrice;
}
