package com.rhc.ambulanceservice.repository;

import com.rhc.ambulanceservice.entity.AmbulanceOperator;
import com.rhc.ambulanceservice.entity.OperatorStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AmbulanceOperatorRepository extends JpaRepository<AmbulanceOperator, Long> {
    Optional<AmbulanceOperator> findByUserId(Long userId);
    List<AmbulanceOperator> findByStatus(OperatorStatus status);
}
