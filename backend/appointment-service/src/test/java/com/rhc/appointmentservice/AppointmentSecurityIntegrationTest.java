package com.rhc.appointmentservice;

import com.rhc.appointmentservice.client.DoctorClient;
import com.rhc.appointmentservice.entity.Appointment;
import com.rhc.appointmentservice.entity.AppointmentStatus;
import com.rhc.appointmentservice.repository.AppointmentRepository;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpHeaders;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Date;
import java.util.Map;
import java.util.Set;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AppointmentSecurityIntegrationTest {

    private static final String JWT_SECRET = "404E635266556A586E3272357538782F413F4528462B4B6250645367566B5970";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private AppointmentRepository appointmentRepository;

    @MockBean
    private DoctorClient doctorClient;

    @BeforeEach
    void setUp() {
        appointmentRepository.deleteAll();
        appointmentRepository.save(Appointment.builder()
                .patientId(200L)
                .doctorId(300L)
                .appointmentDate(LocalDate.now().plusDays(1))
                .startTime(LocalTime.of(10, 0))
                .endTime(LocalTime.of(10, 30))
                .status(AppointmentStatus.CONFIRMED)
                .reason("Persistent cough")
                .build());
    }

    @Test
    void onlyAppointmentParticipantsCanReadAndDoctorCanChangeState() throws Exception {
        Long appointmentId = appointmentRepository.findAll().get(0).getId();

        mockMvc.perform(get("/api/appointments/" + appointmentId)
                        .header(HttpHeaders.AUTHORIZATION, bearerToken(999L, "PATIENT")))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/appointments/" + appointmentId)
                        .header(HttpHeaders.AUTHORIZATION, bearerToken(200L, "PATIENT")))
                .andExpect(status().isOk());

        mockMvc.perform(patch("/api/appointments/" + appointmentId + "/cancel")
                        .header(HttpHeaders.AUTHORIZATION, bearerToken(999L, "PATIENT")))
                .andExpect(status().isForbidden());

        mockMvc.perform(patch("/api/appointments/" + appointmentId + "/no-show")
                        .header(HttpHeaders.AUTHORIZATION, bearerToken(300L, "DOCTOR")))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/appointments/" + appointmentId)
                        .header(HttpHeaders.AUTHORIZATION, bearerToken(901L, "ADMIN")))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/appointments/patient/200")
                        .header(HttpHeaders.AUTHORIZATION, bearerToken(901L, "ADMIN")))
                .andExpect(status().isForbidden());
    }

    @Test
    void missingOrInvalidBearerTokenReturnsUnauthorized() throws Exception {
        mockMvc.perform(get("/api/appointments/patient/200"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/appointments/patient/200")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer invalid-token"))
                .andExpect(status().isUnauthorized());
    }

    private String bearerToken(Long userId, String role) {
        return "Bearer " + Jwts.builder()
                .claims(Map.of("userId", userId, "roles", Set.of(role)))
                .subject("user-" + userId)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + 60_000))
                .signWith(Keys.hmacShaKeyFor(JWT_SECRET.getBytes(StandardCharsets.UTF_8)))
                .compact();
    }
}
