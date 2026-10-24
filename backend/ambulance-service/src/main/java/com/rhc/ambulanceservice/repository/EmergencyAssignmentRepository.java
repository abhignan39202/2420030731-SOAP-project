package com.rhc.ambulanceservice.repository;

import com.rhc.ambulanceservice.entity.EmergencyAssignment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface EmergencyAssignmentRepository extends JpaRepository<EmergencyAssignment, Long> {
    Optional<EmergencyAssignment> findByEmergencyRequestId(Long emergencyRequestId);
}
