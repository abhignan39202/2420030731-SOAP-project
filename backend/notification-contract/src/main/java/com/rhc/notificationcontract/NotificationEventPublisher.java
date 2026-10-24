package com.rhc.notificationcontract;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Slf4j
public class NotificationEventPublisher {
    private final ApplicationEventPublisher applicationEventPublisher;
    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;

    private final String topic;

    public NotificationEventPublisher(ApplicationEventPublisher applicationEventPublisher,
                                      KafkaTemplate<String, String> kafkaTemplate,
                                      ObjectMapper objectMapper,
                                      @Value("${notification.kafka.topic:rhc.notification.events}") String topic) {
        this.applicationEventPublisher = applicationEventPublisher;
        this.kafkaTemplate = kafkaTemplate;
        this.objectMapper = objectMapper;
        this.topic = topic;
    }

    public void publish(NotificationEvent event) {
        applicationEventPublisher.publishEvent(event);
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void publishAfterCommit(NotificationEvent event) {
        try {
            String payload = objectMapper.writeValueAsString(event);
            kafkaTemplate.send(topic, event.eventId(), payload).whenComplete((result, error) -> {
                if (error != null) {
                    log.error("Failed to publish notification event {} to Kafka", event.eventId(), error);
                }
            });
        } catch (JsonProcessingException | RuntimeException error) {
            log.error("Failed to serialize or publish notification event {} to Kafka", event.eventId(), error);
        }
    }
}
