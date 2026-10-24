package com.rhc.notificationcontract;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

public record NotificationEvent(
        String eventId,
        String eventType,
        Long userId,
        String title,
        String body,
        Map<String, String> data,
        LocalDateTime scheduledAt,
        LocalDateTime occurredAt) {

    public static NotificationEvent now(String eventType, Long userId, String title, String body, Map<String, String> data) {
        LocalDateTime now = LocalDateTime.now();
        return new NotificationEvent(UUID.randomUUID().toString(), eventType, userId, title, body, Map.copyOf(data), now, now);
    }

    public static NotificationEvent scheduled(String eventId, String eventType, Long userId, String title, String body,
                                               Map<String, String> data, LocalDateTime scheduledAt) {
        return new NotificationEvent(eventId, eventType, userId, title, body, Map.copyOf(data), scheduledAt, LocalDateTime.now());
    }
}
