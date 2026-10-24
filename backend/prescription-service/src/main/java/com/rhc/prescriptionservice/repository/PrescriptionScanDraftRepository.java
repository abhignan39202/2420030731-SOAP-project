package com.rhc.prescriptionservice.repository;

import com.rhc.prescriptionservice.entity.PrescriptionScanDraft;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface PrescriptionScanDraftRepository extends JpaRepository<PrescriptionScanDraft, Long> {
    List<PrescriptionScanDraft> findAllByPatientIdOrderByCreatedAtDesc(Long patientId);
    Optional<PrescriptionScanDraft> findByIdAndPatientId(Long id, Long patientId);
}
