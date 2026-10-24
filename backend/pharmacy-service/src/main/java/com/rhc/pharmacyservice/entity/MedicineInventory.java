package com.rhc.pharmacyservice.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "medicine_inventory", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"pharmacy_id", "medicine_id"})
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MedicineInventory {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pharmacy_id", nullable = false)
    @JsonIgnore
    @ToString.Exclude
    private Pharmacy pharmacy;

    @Column(nullable = false)
    private Long medicineId;

    @Column(nullable = false)
    private String medicineName;

    @Column(nullable = false)
    private Integer availableQuantity;

    @Builder.Default
    @Column(nullable = false)
    private Integer reservedQuantity = 0;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal price;

    @Builder.Default
    @Column(nullable = false)
    private boolean active = true;

    @Column(updatable = false)
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
