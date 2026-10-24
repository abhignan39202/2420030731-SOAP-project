package com.rhc.medicineservice.client;

import com.rhc.medicineservice.dto.PrescriptionResponse;
import com.rhc.medicineservice.config.FeignAuthConfig;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "prescription-service", configuration = FeignAuthConfig.class)
public interface PrescriptionClient {
    
    @GetMapping("/api/prescriptions/{id}")
    PrescriptionResponse getPrescriptionById(@PathVariable("id") Long id);

    @GetMapping("/api/prescriptions/consultation/{consultationId}")
    PrescriptionResponse getPrescriptionByConsultation(@PathVariable("consultationId") Long consultationId);
}
