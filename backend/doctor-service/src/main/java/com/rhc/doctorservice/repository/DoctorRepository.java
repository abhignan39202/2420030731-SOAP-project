package com.rhc.doctorservice.repository;

import com.rhc.doctorservice.entity.Doctor;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface DoctorRepository extends JpaRepository<Doctor, Long> {
    List<Doctor> findBySpecializationAndStatus(String specialization, Doctor.VerificationStatus status);
    List<Doctor> findByStatus(Doctor.VerificationStatus status);
    Optional<Doctor> findByUserId(Long userId);
}
