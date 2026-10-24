package com.rhc.prescriptionservice.repository;

import com.rhc.prescriptionservice.entity.PrescriptionItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PrescriptionItemRepository extends JpaRepository<PrescriptionItem, Long> {
    List<PrescriptionItem> findByPrescriptionId(Long prescriptionId);
}
