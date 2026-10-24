package com.rhc.pharmacyservice.config;

import com.rhc.pharmacyservice.entity.MedicineInventory;
import com.rhc.pharmacyservice.entity.Pharmacy;
import com.rhc.pharmacyservice.entity.PharmacyStatus;
import com.rhc.pharmacyservice.repository.MedicineInventoryRepository;
import com.rhc.pharmacyservice.repository.PharmacyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final PharmacyRepository pharmacyRepository;
    private final MedicineInventoryRepository inventoryRepository;

    @Value("${pharmacy.seed-data.enabled:false}")
    private boolean seedDataEnabled;

    @Override
    public void run(String... args) throws Exception {
        // Development-only records are inserted once into an empty pharmacy database.
        if (seedDataEnabled && pharmacyRepository.count() == 0) {
            Pharmacy greenValley = pharmacyRepository.save(Pharmacy.builder()
                    .name("Green Valley Rural Pharmacy")
                    .licenseNumber("RHC-PHARM-001")
                    .address("Main Health Post Road, Green Valley")
                    .phone("+91 98765 43210")
                    .email("greenvalley.pharmacy@rhc.org")
                    .status(PharmacyStatus.ACTIVE)
                    .build());
            seedInventory(greenValley, 1L, "Paracetamol 500mg", 100, "15.50");
            seedInventory(greenValley, 2L, "Dextromethorphan Syrup", 30, "45.00");

            Pharmacy riverbend = pharmacyRepository.save(Pharmacy.builder()
                    .name("Riverbend Community Pharmacy")
                    .licenseNumber("RHC-PHARM-002")
                    .address("Riverbend Market Road")
                    .status(PharmacyStatus.ACTIVE)
                    .build());
            seedInventory(riverbend, 3L, "Cetirizine 10mg", 25, "12.00");

            Pharmacy hillcrest = pharmacyRepository.save(Pharmacy.builder()
                    .name("Hillcrest Pharmacy")
                    .licenseNumber("RHC-PHARM-003")
                    .address("Hillcrest Clinic Road")
                    .status(PharmacyStatus.ACTIVE)
                    .build());
            seedInventory(hillcrest, 1L, "Paracetamol 500mg", 0, "15.50");
        }
    }

    private void seedInventory(Pharmacy pharmacy, Long medicineId, String medicineName, int available, String price) {
        inventoryRepository.save(MedicineInventory.builder()
                .pharmacy(pharmacy)
                .medicineId(medicineId)
                .medicineName(medicineName)
                .availableQuantity(available)
                .reservedQuantity(0)
                .price(new BigDecimal(price))
                .active(true)
                .build());
    }
}
