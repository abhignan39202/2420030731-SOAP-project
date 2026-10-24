package com.rhc.prescriptionservice.client;

import com.rhc.prescriptionservice.dto.ConsultationResponse;
import com.rhc.prescriptionservice.config.FeignAuthConfig;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "consultation-service", configuration = FeignAuthConfig.class)
public interface ConsultationClient {

    @GetMapping("/api/consultations/{id}")
    ConsultationResponse getConsultationById(@PathVariable("id") Long id);
}
