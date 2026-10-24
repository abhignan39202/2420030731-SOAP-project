package com.rhc.pharmacyservice.repository;

import com.rhc.pharmacyservice.entity.MedicineInventory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface MedicineInventoryRepository extends JpaRepository<MedicineInventory, Long> {
    Optional<MedicineInventory> findByPharmacyIdAndMedicineId(Long pharmacyId, Long medicineId);
    List<MedicineInventory> findByPharmacyIdAndActiveTrue(Long pharmacyId);

    @Modifying(flushAutomatically = true)
    @Query("update MedicineInventory i set i.availableQuantity = i.availableQuantity - :quantity, " +
            "i.reservedQuantity = i.reservedQuantity + :quantity " +
            "where i.id = :inventoryId and i.active = true and i.availableQuantity >= :quantity")
    int reserveAvailableStock(@Param("inventoryId") Long inventoryId, @Param("quantity") int quantity);

    @Modifying(flushAutomatically = true)
    @Query("update MedicineInventory i set i.availableQuantity = i.availableQuantity + :quantity, " +
            "i.reservedQuantity = i.reservedQuantity - :quantity " +
            "where i.id = :inventoryId and i.reservedQuantity >= :quantity")
    int releaseReservedStock(@Param("inventoryId") Long inventoryId, @Param("quantity") int quantity);

    @Modifying(flushAutomatically = true)
    @Query("update MedicineInventory i set i.reservedQuantity = i.reservedQuantity - :quantity " +
            "where i.id = :inventoryId and i.reservedQuantity >= :quantity")
    int consumeReservedStock(@Param("inventoryId") Long inventoryId, @Param("quantity") int quantity);
}
