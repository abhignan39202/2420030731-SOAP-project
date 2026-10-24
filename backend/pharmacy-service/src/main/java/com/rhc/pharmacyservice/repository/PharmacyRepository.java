package com.rhc.pharmacyservice.repository;

import com.rhc.pharmacyservice.entity.Pharmacy;
import com.rhc.pharmacyservice.entity.PharmacyStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface PharmacyRepository extends JpaRepository<Pharmacy, Long> {
    List<Pharmacy> findByStatus(PharmacyStatus status);
    Optional<Pharmacy> findByLicenseNumber(String licenseNumber);
    Optional<Pharmacy> findByOwnerUserId(Long ownerUserId);
    boolean existsByOwnerUserId(Long ownerUserId);
    boolean existsByIdAndOwnerUserId(Long id, Long ownerUserId);
}
