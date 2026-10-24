package com.rhc.pharmacyservice.client;

import com.rhc.pharmacyservice.dto.PrescriptionResponse;
import com.rhc.pharmacyservice.config.FeignAuthConfig;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "prescription-service", configuration = FeignAuthConfig.class)
public interface PrescriptionClient {
    @GetMapping("/api/prescriptions/{id}")
    PrescriptionResponse getPrescriptionById(@PathVariable("id") Long id);
}
