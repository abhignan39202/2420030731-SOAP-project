package com.rhc.notificationservice.controller;

import com.rhc.notificationservice.dto.DeviceRegistrationRequest;
import com.rhc.notificationservice.dto.DeviceResponse;
import com.rhc.notificationservice.security.AuthenticatedPrincipal;
import com.rhc.notificationservice.service.DeviceRegistrationService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/notifications/devices")
public class DeviceRegistrationController {
    private final DeviceRegistrationService devices;

    public DeviceRegistrationController(DeviceRegistrationService devices) { this.devices = devices; }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public DeviceResponse register(@AuthenticationPrincipal AuthenticatedPrincipal principal,
                                   @Valid @RequestBody DeviceRegistrationRequest request) {
        return devices.register(principal.userId(), request);
    }

    @GetMapping
    public List<DeviceResponse> list(@AuthenticationPrincipal AuthenticatedPrincipal principal) {
        return devices.list(principal.userId());
    }

    @DeleteMapping("/{deviceId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deactivate(@AuthenticationPrincipal AuthenticatedPrincipal principal, @PathVariable Long deviceId) {
        devices.deactivate(principal.userId(), deviceId);
    }
}
