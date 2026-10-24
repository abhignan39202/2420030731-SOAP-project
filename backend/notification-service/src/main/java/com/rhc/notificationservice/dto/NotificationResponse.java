package com.rhc.notificationservice.dto;

import com.rhc.notificationservice.entity.NotificationStatus;

import java.time.LocalDateTime;
import java.util.Map;

public record NotificationResponse(Long id, String eventId, String eventType, String title, String body,
                                   Map<String, String> data, LocalDateTime scheduledAt,
                                   NotificationStatus status, LocalDateTime createdAt, LocalDateTime sentAt) { }
