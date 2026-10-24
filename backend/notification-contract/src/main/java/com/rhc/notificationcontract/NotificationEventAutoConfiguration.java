package com.rhc.notificationcontract;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.annotation.Bean;
import org.springframework.kafka.core.KafkaTemplate;

@AutoConfiguration
@ConditionalOnClass(KafkaTemplate.class)
@ConditionalOnProperty(prefix = "notification.kafka", name = "enabled", havingValue = "true")
public class NotificationEventAutoConfiguration {
    @Bean
    NotificationEventPublisher notificationEventPublisher(ApplicationEventPublisher applicationEventPublisher,
                                                          KafkaTemplate<String, String> kafkaTemplate,
                                                          ObjectMapper objectMapper,
                                                          @Value("${notification.kafka.topic:rhc.notification.events}") String topic) {
        return new NotificationEventPublisher(applicationEventPublisher, kafkaTemplate, objectMapper, topic);
    }
}
