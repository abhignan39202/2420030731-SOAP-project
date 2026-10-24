package com.rhc.pharmacyservice.dto;

import com.rhc.pharmacyservice.entity.OrderStatus;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderResponse {
    private Long id;
    private Long patientId;
    private Long pharmacyId;
    private String pharmacyName;
    private Long prescriptionId;
    private OrderStatus status;
    private BigDecimal totalAmount;
    private String deliveryAddress;
    private List<OrderItemResponse> items;
    private LocalDateTime createdAt;
    private LocalDateTime deliveredAt;
}
