package com.rhc.ambulanceservice.repository;

import com.rhc.ambulanceservice.entity.Ambulance;
import com.rhc.ambulanceservice.entity.AmbulanceStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface AmbulanceRepository extends JpaRepository<Ambulance, Long> {
    List<Ambulance> findByStatus(AmbulanceStatus status);

    Optional<Ambulance> findByRegistrationNumber(String registrationNumber);

    /**
     * Pessimistic write lock to prevent concurrent assignment of the same ambulance.
     * Critical for concurrency protection: two simultaneous emergency requests
     * must not assign the same ambulance.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT a FROM Ambulance a WHERE a.status = :status ORDER BY a.id ASC")
    List<Ambulance> findAvailableWithLock(@Param("status") AmbulanceStatus status);

    /**
     * Compare-and-set claim. The write lock above coordinates nearest-unit selection;
     * this conditional update is the final database-level guard against double booking.
     */
    @Modifying(flushAutomatically = true)
    @Query("UPDATE Ambulance a SET a.status = :reservedStatus WHERE a.id = :ambulanceId AND a.status = :availableStatus")
    int reserveIfAvailable(@Param("ambulanceId") Long ambulanceId,
                           @Param("availableStatus") AmbulanceStatus availableStatus,
                           @Param("reservedStatus") AmbulanceStatus reservedStatus);
}
