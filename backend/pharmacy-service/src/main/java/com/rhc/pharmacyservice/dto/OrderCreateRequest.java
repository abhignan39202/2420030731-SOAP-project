package com.rhc.pharmacyservice.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.*;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderCreateRequest {
    @NotNull
    private Long prescriptionId;
    @NotNull
    private Long pharmacyId;
    @NotBlank
    private String deliveryAddress;
    @NotEmpty @Valid
    private List<OrderItemRequest> items;
}
