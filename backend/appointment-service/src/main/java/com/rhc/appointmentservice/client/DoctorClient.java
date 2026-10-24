package com.rhc.appointmentservice.client;

import com.rhc.appointmentservice.dto.DoctorProfileResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "doctor-service")
public interface DoctorClient {

    @GetMapping("/api/doctors/{userId}")
    DoctorProfileResponse getDoctorById(@PathVariable("userId") Long userId);
}
