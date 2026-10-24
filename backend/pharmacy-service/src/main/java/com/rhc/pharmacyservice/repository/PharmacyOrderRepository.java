package com.rhc.pharmacyservice.repository;

import com.rhc.pharmacyservice.entity.PharmacyOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import java.util.List;

public interface PharmacyOrderRepository extends JpaRepository<PharmacyOrder, Long> {
    List<PharmacyOrder> findByPatientIdOrderByCreatedAtDesc(Long patientId);
    List<PharmacyOrder> findByPharmacyIdOrderByCreatedAtDesc(Long pharmacyId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select distinct o from PharmacyOrder o join fetch o.pharmacy left join fetch o.items where o.id = :id")
    java.util.Optional<PharmacyOrder> findByIdForUpdate(@Param("id") Long id);
}
