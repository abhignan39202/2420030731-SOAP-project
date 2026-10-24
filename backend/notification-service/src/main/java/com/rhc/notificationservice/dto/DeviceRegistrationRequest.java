package com.rhc.notificationservice.dto;

import com.rhc.notificationservice.entity.DevicePlatform;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record DeviceRegistrationRequest(
        @NotBlank @Size(max = 200) String deviceIdentifier,
        @NotNull DevicePlatform platform,
        @NotBlank @Size(max = 4096) String pushToken) { }
