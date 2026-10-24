package com.rhc.notificationservice.dto;

import com.rhc.notificationservice.entity.DevicePlatform;

import java.time.LocalDateTime;

public record DeviceResponse(Long id, Long userId, String deviceIdentifier, DevicePlatform platform,
                             boolean active, LocalDateTime createdAt, LocalDateTime lastSeenAt) { }
