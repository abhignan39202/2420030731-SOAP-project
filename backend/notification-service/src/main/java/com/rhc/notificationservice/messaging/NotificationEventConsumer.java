package com.rhc.notificationservice.messaging;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rhc.notificationcontract.NotificationEvent;
import com.rhc.notificationservice.service.NotificationDispatchService;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
public class NotificationEventConsumer {
    private final ObjectMapper objectMapper;
    private final NotificationDispatchService dispatchService;

    public NotificationEventConsumer(ObjectMapper objectMapper, NotificationDispatchService dispatchService) {
        this.objectMapper = objectMapper;
        this.dispatchService = dispatchService;
    }

    @KafkaListener(topics = "${notification.kafka.topic:rhc.notification.events}",
            groupId = "${spring.kafka.consumer.group-id:notification-service}")
    public void consume(String payload) throws Exception {
        NotificationEvent event = objectMapper.readValue(payload, NotificationEvent.class);
        dispatchService.accept(event);
    }
}
