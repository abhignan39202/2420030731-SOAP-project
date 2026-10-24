package com.rhc.pharmacyservice.repository;

import com.rhc.pharmacyservice.entity.PharmacyOrderItem;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PharmacyOrderItemRepository extends JpaRepository<PharmacyOrderItem, Long> {
}
