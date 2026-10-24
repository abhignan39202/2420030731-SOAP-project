package com.rhc.notificationservice.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rhc.notificationcontract.NotificationEvent;
import com.rhc.notificationservice.dto.NotificationResponse;
import com.rhc.notificationservice.entity.NotificationRecord;
import com.rhc.notificationservice.entity.NotificationStatus;
import com.rhc.notificationservice.entity.RegisteredDevice;
import com.rhc.notificationservice.fcm.FcmSender;
import com.rhc.notificationservice.fcm.InvalidPushTokenException;
import com.rhc.notificationservice.repository.NotificationRecordRepository;
import com.rhc.notificationservice.repository.RegisteredDeviceRepository;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class NotificationDispatchService {
    private static final Set<String> SUPPORTED_EVENTS = Set.of(
            "AMBULANCE_ASSIGNED", "AMBULANCE_EN_ROUTE", "AMBULANCE_ARRIVED", "PATIENT_PICKED", "HOSPITAL_REACHED", "EMERGENCY_COMPLETED",
            "APPOINTMENT_CONFIRMED", "NEW_PRESCRIPTION", "PHARMACY_ORDER_CONFIRMED",
            "PHARMACY_ORDER_DELIVERED", "MEDICATION_REMINDER");

    private final NotificationRecordRepository notifications;
    private final RegisteredDeviceRepository devices;
    private final ObjectProvider<FcmSender> fcmSenders;
    private final ObjectMapper objectMapper;

    public NotificationDispatchService(NotificationRecordRepository notifications, RegisteredDeviceRepository devices,
                                       ObjectProvider<FcmSender> fcmSenders, ObjectMapper objectMapper) {
        this.notifications = notifications;
        this.devices = devices;
        this.fcmSenders = fcmSenders;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public void accept(NotificationEvent event) {
        if (event == null || event.eventId() == null || event.eventId().isBlank() || event.userId() == null
                || !SUPPORTED_EVENTS.contains(event.eventType())) {
            throw new IllegalArgumentException("Notification event is missing a required field or has an unsupported type");
        }
        if (notifications.findByEventId(event.eventId()).isPresent()) return;

        NotificationRecord record = new NotificationRecord();
        record.setEventId(event.eventId());
        record.setUserId(event.userId());
        record.setEventType(event.eventType());
        record.setTitle(safeText(event.title(), "Rural Health Companion", 160));
        record.setBody(safeText(event.body(), "You have a new notification.", 1000));
        try {
            record.setDataJson(objectMapper.writeValueAsString(event.data() == null ? Map.of() : event.data()));
        } catch (JsonProcessingException ex) {
            throw new IllegalArgumentException("Notification event data could not be stored", ex);
        }
        record.setScheduledAt(event.scheduledAt());
        record.setStatus(NotificationStatus.PENDING);
        record.setAttempts(0);
        record = notifications.saveAndFlush(record);
        if (record.getScheduledAt() == null || !record.getScheduledAt().isAfter(LocalDateTime.now())) {
            dispatch(record);
        }
    }

    @Transactional
    public void dispatchPending() {
        List<NotificationRecord> pending = notifications.findDue(NotificationStatus.PENDING, LocalDateTime.now(), PageRequest.of(0, 100));
        pending.forEach(this::dispatch);
    }

    @Transactional(readOnly = true)
    public List<NotificationResponse> listForUser(Long userId) {
        return notifications.findByUserIdOrderByCreatedAtDesc(userId).stream().map(this::toResponse).toList();
    }

    private void dispatch(NotificationRecord record) {
        FcmSender sender = fcmSenders.getIfAvailable();
        if (sender == null) {
            record.setNextAttemptAt(LocalDateTime.now().plusMinutes(15));
            return; // Keep it visibly pending until real Firebase credentials are configured.
        }
        List<RegisteredDevice> activeDevices = devices.findByUserIdAndActiveTrue(record.getUserId());
        if (activeDevices.isEmpty()) {
            record.setNextAttemptAt(LocalDateTime.now().plusMinutes(15));
            return;
        }

        record.setStatus(NotificationStatus.SENDING);
        record.setAttempts(record.getAttempts() + 1);
        Map<String, String> data = parseData(record.getDataJson());
        int accepted = 0;
        int failures = 0;
        boolean transientFailure = false;
        String lastError = null;
        for (RegisteredDevice device : activeDevices) {
            try {
                String messageId = sender.send(device.getPushToken(), record.getTitle(), record.getBody(), data);
                if (messageId == null || messageId.isBlank()) {
                    throw new IllegalStateException("FCM did not return a message identifier");
                }
                accepted++;
            } catch (InvalidPushTokenException invalidToken) {
                device.setActive(false);
                devices.save(device);
                failures++;
                lastError = "An FCM device token is no longer registered.";
            } catch (RuntimeException deliveryError) {
                failures++;
                transientFailure = true;
                lastError = safeText(deliveryError.getMessage(), "FCM delivery failed.", 1000);
            }
        }

        record.setLastError(lastError);
        if (accepted == activeDevices.size()) {
            record.setStatus(NotificationStatus.SENT);
            record.setSentAt(LocalDateTime.now());
            record.setNextAttemptAt(null);
        } else if (accepted > 0) {
            record.setStatus(NotificationStatus.PARTIAL);
            record.setSentAt(LocalDateTime.now());
            record.setNextAttemptAt(null);
        } else if (transientFailure) {
            record.setStatus(NotificationStatus.PENDING);
            record.setNextAttemptAt(LocalDateTime.now().plusMinutes(1));
        } else if (failures > 0) {
            record.setStatus(NotificationStatus.FAILED);
            record.setNextAttemptAt(null);
        }
    }

    private Map<String, String> parseData(String json) {
        try {
            return objectMapper.readValue(json == null ? "{}" : json, new TypeReference<>() { });
        } catch (JsonProcessingException ex) {
            return new LinkedHashMap<>();
        }
    }

    private String safeText(String value, String fallback, int maxLength) {
        if (value == null || value.isBlank()) return fallback;
        return value.length() <= maxLength ? value : value.substring(0, maxLength);
    }

    private NotificationResponse toResponse(NotificationRecord record) {
        return new NotificationResponse(record.getId(), record.getEventId(), record.getEventType(), record.getTitle(),
                record.getBody(), parseData(record.getDataJson()), record.getScheduledAt(), record.getStatus(),
                record.getCreatedAt(), record.getSentAt());
    }
}
