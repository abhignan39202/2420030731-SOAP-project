package com.rhc.consultationservice.repository;

import com.rhc.consultationservice.entity.Consultation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ConsultationRepository extends JpaRepository<Consultation, Long> {

    Optional<Consultation> findByAppointmentId(Long appointmentId);

    List<Consultation> findByPatientId(Long patientId);

    List<Consultation> findByDoctorId(Long doctorId);

    boolean existsByAppointmentId(Long appointmentId);
}
