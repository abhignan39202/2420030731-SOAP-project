package com.rhc.notificationservice;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rhc.notificationcontract.NotificationEvent;
import com.rhc.notificationservice.entity.DevicePlatform;
import com.rhc.notificationservice.entity.NotificationRecord;
import com.rhc.notificationservice.entity.NotificationStatus;
import com.rhc.notificationservice.entity.RegisteredDevice;
import com.rhc.notificationservice.fcm.FcmSender;
import com.rhc.notificationservice.fcm.InvalidPushTokenException;
import com.rhc.notificationservice.messaging.NotificationEventConsumer;
import com.rhc.notificationservice.repository.NotificationRecordRepository;
import com.rhc.notificationservice.repository.RegisteredDeviceRepository;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Primary;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.Date;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(NotificationServiceIntegrationTest.TestFcmConfiguration.class)
class NotificationServiceIntegrationTest {
    private static final String JWT_SECRET = "404E635266556A586E3272357538782F413F4528462B4B6250645367566B5970";

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired RegisteredDeviceRepository devices;
    @Autowired NotificationRecordRepository notifications;
    @Autowired NotificationEventConsumer consumer;
    @Autowired RejectingFcmSender fcmSender;

    @BeforeEach
    void clearDatabase() {
        notifications.deleteAll();
        devices.deleteAll();
        fcmSender.reset();
    }

    @Test
    void authenticatedDeviceRegistrationUsesJwtOwnerAndUpdatesItsToken() throws Exception {
        String body = """
                {"deviceIdentifier":"phone-1","platform":"ANDROID","pushToken":"token-first"}
                """;

        String response = mvc.perform(post("/api/notifications/devices")
                        .header("Authorization", bearer(41L)).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.userId").value(41))
                .andExpect(jsonPath("$.deviceIdentifier").value("phone-1"))
                .andExpect(jsonPath("$.pushToken").doesNotExist())
                .andReturn().getResponse().getContentAsString();
        Long id = objectMapper.readTree(response).get("id").asLong();

        mvc.perform(post("/api/notifications/devices")
                        .header("Authorization", bearer(41L)).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"deviceIdentifier\":\"phone-1\",\"platform\":\"IOS\",\"pushToken\":\"token-updated\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(id))
                .andExpect(jsonPath("$.userId").value(41));

        RegisteredDevice saved = devices.findById(id).orElseThrow();
        assertThat(saved.getPushToken()).isEqualTo("token-updated");
        assertThat(saved.getPlatform()).isEqualTo(DevicePlatform.IOS);
        assertThat(saved.isActive()).isTrue();
        assertThat(saved.getCreatedAt()).isNotNull();
        assertThat(saved.getLastSeenAt()).isNotNull();
    }

    @Test
    void deviceRegistrationRequiresAuthentication() throws Exception {
        mvc.perform(post("/api/notifications/devices").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"deviceIdentifier\":\"phone-unauth\",\"platform\":\"ANDROID\",\"pushToken\":\"token\"}"))
                .andExpect(status().isUnauthorized());
        assertThat(devices.findAll()).isEmpty();
    }

    @Test
    void aUserCannotDeactivateAnotherUsersDevice() throws Exception {
        RegisteredDevice device = new RegisteredDevice();
        device.setUserId(41L);
        device.setDeviceIdentifier("private-device");
        device.setPlatform(DevicePlatform.WEB);
        device.setPushToken("secret-token");
        device.setActive(true);
        device = devices.saveAndFlush(device);

        mvc.perform(delete("/api/notifications/devices/{id}", device.getId())
                        .header("Authorization", bearer(42L)))
                .andExpect(status().isNotFound());
        assertThat(devices.findById(device.getId()).orElseThrow().isActive()).isTrue();
    }

    @Test
    void eventConsumerPersistsNotificationAndDuplicateEventIsIdempotent() throws Exception {
        NotificationEvent event = event("event-duplicate", "APPOINTMENT_CONFIRMED", 41L, LocalDateTime.now());
        String payload = objectMapper.writeValueAsString(event);

        consumer.consume(payload);
        consumer.consume(payload);

        assertThat(notifications.findAll()).hasSize(1);
        NotificationRecord saved = notifications.findByEventId("event-duplicate").orElseThrow();
        assertThat(saved.getStatus()).isEqualTo(NotificationStatus.PENDING);
        assertThat(saved.getEventType()).isEqualTo("APPOINTMENT_CONFIRMED");
        assertThat(saved.getUserId()).isEqualTo(41L);
        assertThat(fcmSender.calls()).isZero(); // With no registered device, no FCM delivery is claimed.
    }

    @Test
    void expiredFcmTokenIsDeactivatedAndDuplicateEventDoesNotRetryIt() throws Exception {
        RegisteredDevice device = new RegisteredDevice();
        device.setUserId(41L);
        device.setDeviceIdentifier("expired-phone");
        device.setPlatform(DevicePlatform.ANDROID);
        device.setPushToken("expired-token");
        device.setActive(true);
        devices.saveAndFlush(device);

        String payload = objectMapper.writeValueAsString(
                event("event-invalid-token", "AMBULANCE_ASSIGNED", 41L, LocalDateTime.now()));

        consumer.consume(payload);
        consumer.consume(payload);

        assertThat(devices.findById(device.getId()).orElseThrow().isActive()).isFalse();
        assertThat(notifications.findByEventId("event-invalid-token").orElseThrow().getStatus())
                .isEqualTo(NotificationStatus.FAILED);
        assertThat(fcmSender.calls()).isEqualTo(1);
    }

    @Test
    void medicationReminderScheduledForLaterStaysPendingUntilItsDueTime() throws Exception {
        LocalDateTime dueAt = LocalDateTime.now().plusHours(1);
        dueAt = dueAt.withNano((dueAt.getNano() / 1_000) * 1_000);
        consumer.consume(objectMapper.writeValueAsString(
                event("MEDICATION_REMINDER:19", "MEDICATION_REMINDER", 41L, dueAt)));

        NotificationRecord saved = notifications.findByEventId("MEDICATION_REMINDER:19").orElseThrow();
        assertThat(saved.getStatus()).isEqualTo(NotificationStatus.PENDING);
        assertThat(saved.getScheduledAt()).isEqualTo(dueAt);
        assertThat(fcmSender.calls()).isZero();
    }

    private NotificationEvent event(String id, String type, Long userId, LocalDateTime scheduledAt) {
        return new NotificationEvent(id, type, userId, "A notification", "A private notification body.",
                Map.of("referenceId", "7"), scheduledAt, LocalDateTime.now());
    }

    private String bearer(Long userId) {
        return "Bearer " + Jwts.builder()
                .claims(Map.of("userId", userId, "roles", Set.of("PATIENT")))
                .subject("patient-" + userId).issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + 60_000))
                .signWith(Keys.hmacShaKeyFor(JWT_SECRET.getBytes(java.nio.charset.StandardCharsets.UTF_8))).compact();
    }

    @TestConfiguration
    static class TestFcmConfiguration {
        @Bean
        @Primary
        RejectingFcmSender testFcmSender() { return new RejectingFcmSender(); }
    }

    static class RejectingFcmSender implements FcmSender {
        private final AtomicInteger calls = new AtomicInteger();

        @Override
        public String send(String pushToken, String title, String body, Map<String, String> data) {
            calls.incrementAndGet();
            throw new InvalidPushTokenException("test token is unregistered", null);
        }

        int calls() { return calls.get(); }
        void reset() { calls.set(0); }
    }
}
