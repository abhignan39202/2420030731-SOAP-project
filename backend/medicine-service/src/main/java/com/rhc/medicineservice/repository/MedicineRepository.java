package com.rhc.medicineservice.repository;

import com.rhc.medicineservice.entity.Medicine;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MedicineRepository extends JpaRepository<Medicine, Long> {
    Optional<Medicine> findByNameIgnoreCase(String name);
    List<Medicine> findByActiveTrue();
}
