package com.rhc.medicineservice.repository;

import com.rhc.medicineservice.entity.Medication;
import com.rhc.medicineservice.entity.MedicationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface MedicationRepository extends JpaRepository<Medication, Long> {
    List<Medication> findByPatientId(Long patientId);
    List<Medication> findByPatientIdAndStatus(Long patientId, MedicationStatus status);
    boolean existsByPrescriptionItemId(Long prescriptionItemId);
    List<Medication> findByPrescriptionId(Long prescriptionId);
    List<Medication> findByStatusAndEndDateBefore(MedicationStatus status, LocalDate date);
}
