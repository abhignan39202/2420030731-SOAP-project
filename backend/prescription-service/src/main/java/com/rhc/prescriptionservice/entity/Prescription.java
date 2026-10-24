package com.rhc.prescriptionservice.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "prescriptions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Prescription {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private Long consultationId;

    @Column(nullable = false)
    private Long patientId;

    @Column(nullable = false)
    private Long doctorId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private PrescriptionStatus status = PrescriptionStatus.DRAFT;

    @Column(columnDefinition = "TEXT")
    private String diagnosis;

    @Column(columnDefinition = "TEXT")
    private String generalInstructions;

    private LocalDateTime issuedAt;

    @Column(updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "prescription", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    @ToString.Exclude
    private List<PrescriptionItem> items = new ArrayList<>();

    @Version
    private Long version;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
    
    public void addItem(PrescriptionItem item) {
        items.add(item);
        item.setPrescription(this);
    }
}
