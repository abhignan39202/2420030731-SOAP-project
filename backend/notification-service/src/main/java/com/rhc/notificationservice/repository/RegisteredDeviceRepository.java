package com.rhc.notificationservice.repository;

import com.rhc.notificationservice.entity.RegisteredDevice;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RegisteredDeviceRepository extends JpaRepository<RegisteredDevice, Long> {
    Optional<RegisteredDevice> findByUserIdAndDeviceIdentifier(Long userId, String deviceIdentifier);
    Optional<RegisteredDevice> findByIdAndUserId(Long id, Long userId);
    List<RegisteredDevice> findByUserIdOrderByCreatedAtDesc(Long userId);
    List<RegisteredDevice> findByUserIdAndActiveTrue(Long userId);
}
