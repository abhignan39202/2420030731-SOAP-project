package com.rhc.consultationservice.client;

import com.rhc.consultationservice.dto.DoctorProfileResponse;
import com.rhc.consultationservice.config.FeignAuthConfig;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "doctor-service", configuration = FeignAuthConfig.class)
public interface DoctorClient {

    @GetMapping("/api/doctors/{userId}")
    DoctorProfileResponse getDoctorById(@PathVariable("userId") Long userId);
}
