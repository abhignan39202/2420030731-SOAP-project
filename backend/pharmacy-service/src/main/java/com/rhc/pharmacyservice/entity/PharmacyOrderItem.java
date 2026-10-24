package com.rhc.pharmacyservice.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity
@Table(name = "pharmacy_order_items")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PharmacyOrderItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    @JsonIgnore
    @ToString.Exclude
    private PharmacyOrder order;

    @Column(nullable = false)
    private Long medicineId;

    @Column(nullable = false)
    private String medicineName;

    @Column(nullable = false)
    private Integer quantity;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal unitPrice;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal totalPrice;
}
