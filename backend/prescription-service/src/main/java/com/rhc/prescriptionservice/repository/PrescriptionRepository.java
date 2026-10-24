package com.rhc.prescriptionservice.repository;

import com.rhc.prescriptionservice.entity.Prescription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PrescriptionRepository extends JpaRepository<Prescription, Long> {
    Optional<Prescription> findByConsultationId(Long consultationId);
    List<Prescription> findByPatientId(Long patientId);
    List<Prescription> findByDoctorId(Long doctorId);
    boolean existsByConsultationId(Long consultationId);
}
