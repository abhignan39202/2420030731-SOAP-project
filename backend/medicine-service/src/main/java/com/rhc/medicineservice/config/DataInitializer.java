package com.rhc.medicineservice.config;

import com.rhc.medicineservice.entity.Medicine;
import com.rhc.medicineservice.repository.MedicineRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final MedicineRepository medicineRepository;

    @Value("${medicine.seed-data.enabled:false}")
    private boolean seedDataEnabled;

    @Override
    public void run(String... args) {
        if (seedDataEnabled && medicineRepository.count() == 0) {
            List<Medicine> defaultMedicines = List.of(
                    Medicine.builder().name("Paracetamol").genericName("Paracetamol").dosageForm("Tablet").strength("500mg").description("Pain reliever and a fever reducer").active(true).build(),
                    Medicine.builder().name("Amoxicillin").genericName("Amoxicillin").dosageForm("Capsule").strength("500mg").description("Penicillin antibiotic").active(true).build(),
                    Medicine.builder().name("Cetirizine").genericName("Cetirizine").dosageForm("Tablet").strength("10mg").description("Antihistamine").active(true).build(),
                    Medicine.builder().name("Vitamin D3").genericName("Cholecalciferol").dosageForm("Capsule").strength("60000IU").description("Vitamin supplement").active(true).build(),
                    Medicine.builder().name("Ibuprofen").genericName("Ibuprofen").dosageForm("Tablet").strength("400mg").description("NSAID").active(true).build()
            );
            medicineRepository.saveAll(defaultMedicines);
        }
    }
}
