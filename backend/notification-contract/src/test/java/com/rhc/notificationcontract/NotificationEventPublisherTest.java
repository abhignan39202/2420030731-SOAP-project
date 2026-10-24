package com.rhc.notificationcontract;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class NotificationEventPublisherTest {
    @Test
    void sendsTheSharedNotificationEventToKafkaAfterCommitCallback() throws Exception {
        @SuppressWarnings("unchecked") KafkaTemplate<String, String> kafka = mock(KafkaTemplate.class);
        ApplicationEventPublisher localEvents = mock(ApplicationEventPublisher.class);
        ObjectMapper mapper = new ObjectMapper().findAndRegisterModules();
        when(kafka.send(anyString(), anyString(), anyString())).thenReturn(CompletableFuture.completedFuture(mock(SendResult.class)));
        NotificationEventPublisher publisher = new NotificationEventPublisher(localEvents, kafka, mapper, "rhc.notification.events");
        NotificationEvent event = new NotificationEvent("evt-123", "APPOINTMENT_CONFIRMED", 8L,
                "Appointment confirmed", "Your appointment has been confirmed.", Map.of("appointmentId", "51"),
                LocalDateTime.now(), LocalDateTime.now());

        publisher.publishAfterCommit(event);

        verify(kafka).send(eq("rhc.notification.events"), eq("evt-123"), argThat(payload ->
                payload.contains("APPOINTMENT_CONFIRMED") && payload.contains("appointmentId")));
    }
}
