package com.rhc.notificationservice.service;

import com.rhc.notificationservice.dto.DeviceRegistrationRequest;
import com.rhc.notificationservice.dto.DeviceResponse;
import com.rhc.notificationservice.entity.RegisteredDevice;
import com.rhc.notificationservice.repository.RegisteredDeviceRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class DeviceRegistrationService {
    private final RegisteredDeviceRepository devices;

    public DeviceRegistrationService(RegisteredDeviceRepository devices) { this.devices = devices; }

    @Transactional
    public DeviceResponse register(Long userId, DeviceRegistrationRequest request) {
        RegisteredDevice device = devices.findByUserIdAndDeviceIdentifier(userId, request.deviceIdentifier())
                .orElseGet(RegisteredDevice::new);
        if (device.getId() == null) {
            device.setUserId(userId);
            device.setDeviceIdentifier(request.deviceIdentifier());
        }
        device.setPlatform(request.platform());
        device.setPushToken(request.pushToken());
        device.setActive(true);
        if (device.getCreatedAt() == null) device.setCreatedAt(LocalDateTime.now());
        device.setLastSeenAt(LocalDateTime.now());
        return response(devices.save(device));
    }

    @Transactional(readOnly = true)
    public List<DeviceResponse> list(Long userId) {
        return devices.findByUserIdOrderByCreatedAtDesc(userId).stream().map(this::response).toList();
    }

    @Transactional
    public void deactivate(Long userId, Long deviceId) {
        RegisteredDevice device = devices.findByIdAndUserId(deviceId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        device.setActive(false);
        devices.save(device);
    }

    private DeviceResponse response(RegisteredDevice d) {
        return new DeviceResponse(d.getId(), d.getUserId(), d.getDeviceIdentifier(), d.getPlatform(), d.isActive(),
                d.getCreatedAt(), d.getLastSeenAt());
    }
}
