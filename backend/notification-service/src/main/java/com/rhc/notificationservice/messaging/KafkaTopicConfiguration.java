package com.rhc.notificationservice.messaging;

import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.TopicBuilder;

@Configuration
@ConditionalOnProperty(name = "notification.kafka.admin.enabled", havingValue = "true", matchIfMissing = true)
public class KafkaTopicConfiguration {
    @Bean
    NewTopic notificationEventsTopic(@Value("${notification.kafka.topic:rhc.notification.events}") String topic) {
        return TopicBuilder.name(topic).partitions(1).replicas(1).build();
    }
}
