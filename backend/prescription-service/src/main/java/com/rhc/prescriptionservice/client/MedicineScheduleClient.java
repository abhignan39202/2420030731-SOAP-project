package com.rhc.prescriptionservice.client;

import com.rhc.prescriptionservice.config.FeignAuthConfig;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;

/** Starts the persisted medication schedule after a prescription is finalized. */
@FeignClient(name = "medicine-service", configuration = FeignAuthConfig.class)
public interface MedicineScheduleClient {

    @PostMapping("/api/medicines/from-prescription/{prescriptionId}")
    void createMedicationsFromPrescription(@PathVariable("prescriptionId") Long prescriptionId);
}
