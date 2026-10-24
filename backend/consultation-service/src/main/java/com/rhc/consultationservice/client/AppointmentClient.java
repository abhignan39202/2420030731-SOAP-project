package com.rhc.consultationservice.client;

import com.rhc.consultationservice.dto.AppointmentResponse;
import com.rhc.consultationservice.config.FeignAuthConfig;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;

@FeignClient(name = "appointment-service", configuration = FeignAuthConfig.class)
public interface AppointmentClient {

    @GetMapping("/api/appointments/{id}")
    AppointmentResponse getAppointmentById(@PathVariable("id") Long id);

    @PatchMapping("/api/appointments/{id}/complete")
    AppointmentResponse completeAppointment(@PathVariable("id") Long id);
}
