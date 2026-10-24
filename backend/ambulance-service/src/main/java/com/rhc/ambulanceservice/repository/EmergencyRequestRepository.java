package com.rhc.ambulanceservice.repository;

import com.rhc.ambulanceservice.entity.EmergencyRequest;
import com.rhc.ambulanceservice.entity.EmergencyStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface EmergencyRequestRepository extends JpaRepository<EmergencyRequest, Long> {

    @Query("SELECT e FROM EmergencyRequest e WHERE e.patientId = :patientId AND e.status IN :activeStatuses")
    List<EmergencyRequest> findActiveByPatientId(
            @Param("patientId") Long patientId,
            @Param("activeStatuses") List<EmergencyStatus> activeStatuses);

    List<EmergencyRequest> findByPatientIdOrderByCreatedAtDesc(Long patientId);

    @Query("SELECT e FROM EmergencyRequest e WHERE e.assignedOperator.id = :operatorId AND e.status IN :activeStatuses")
    Optional<EmergencyRequest> findActiveByOperatorId(
            @Param("operatorId") Long operatorId,
            @Param("activeStatuses") List<EmergencyStatus> activeStatuses);

    @Query("SELECT e FROM EmergencyRequest e WHERE e.assignedOperator.id = :operatorId ORDER BY e.createdAt DESC")
    List<EmergencyRequest> findByOperatorIdOrderByCreatedAtDesc(@Param("operatorId") Long operatorId);
}
