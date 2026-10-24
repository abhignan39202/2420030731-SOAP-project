package com.rhc.consultationservice.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rhc.consultationservice.client.AppointmentClient;
import com.rhc.consultationservice.client.DoctorClient;
import com.rhc.consultationservice.dto.*;
import com.rhc.consultationservice.entity.Consultation;
import com.rhc.consultationservice.entity.ConsultationStatus;
import com.rhc.consultationservice.repository.ConsultationRepository;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.http.HttpHeaders;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.time.LocalTime;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.Map;
import java.util.Set;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ConsultationIntegrationTest {

    private static final String JWT_SECRET = "404E635266556A586E3272357538782F413F4528462B4B6250645367566B5970";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private ConsultationRepository consultationRepository;

    @MockBean
    private AppointmentClient appointmentClient;

    @MockBean
    private DoctorClient doctorClient;

    @BeforeEach
    void setUp() {
        consultationRepository.deleteAll();

        AppointmentResponse mockAppointment = AppointmentResponse.builder()
                .id(100L)
                .patientId(200L)
                .doctorId(300L)
                .appointmentDate(LocalDate.now().plusDays(1))
                .startTime(LocalTime.of(10, 0))
                .endTime(LocalTime.of(10, 30))
                .status("CONFIRMED")
                .reason("Chest pain and cough")
                .build();

        DoctorProfileResponse mockDoctor = DoctorProfileResponse.builder()
                .userId(300L)
                .fullName("Dr. Priya Sharma")
                .specialization("Cardiologist")
                .status("APPROVED")
                .isAvailable(true)
                .build();

        when(appointmentClient.getAppointmentById(100L)).thenReturn(mockAppointment);
        when(doctorClient.getDoctorById(anyLong())).thenReturn(mockDoctor);
    }

    @Test
    @DisplayName("Missing or invalid bearer token returns 401")
    void missingOrInvalidBearerTokenReturnsUnauthorized() throws Exception {
        mockMvc.perform(get("/api/consultations/1"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/consultations/1")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer invalid-token"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Full Consultation Lifecycle Integration Test")
    void fullConsultationLifecycle() throws Exception {
        // 1. Create Consultation (Patient 200)
        ConsultationCreateRequest createReq = ConsultationCreateRequest.builder()
                .appointmentId(100L)
                .symptoms("Persistent cough and chest pain")
                .build();

        String createResponse = mockMvc.perform(post("/api/consultations")
                        .header(HttpHeaders.AUTHORIZATION, bearerToken(200L, "PATIENT"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.appointmentId", is(100)))
                .andExpect(jsonPath("$.patientId", is(200)))
                .andExpect(jsonPath("$.doctorId", is(300)))
                .andExpect(jsonPath("$.status", is("SCHEDULED")))
                .andReturn().getResponse().getContentAsString();

        ConsultationResponse created = objectMapper.readValue(createResponse, ConsultationResponse.class);
        Long consultationId = created.getId();

        // Patient identity headers cannot impersonate the assigned doctor, and admins do not get clinical-room access.
        mockMvc.perform(patch("/api/consultations/" + consultationId + "/start")
                        .header(HttpHeaders.AUTHORIZATION, bearerToken(200L, "PATIENT"))
                        .header("X-User-Id", "300"))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/consultations/" + consultationId)
                        .header(HttpHeaders.AUTHORIZATION, bearerToken(901L, "ADMIN")))
                .andExpect(status().isForbidden());

        // 2. Doctor starts consultation
        mockMvc.perform(patch("/api/consultations/" + consultationId + "/start")
                        .header(HttpHeaders.AUTHORIZATION, bearerToken(300L, "DOCTOR")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("IN_PROGRESS")))
                .andExpect(jsonPath("$.startedAt", notNullValue()));

        // 3. Doctor updates notes, diagnosis, follow-up
        ConsultationUpdateRequest updateReq = ConsultationUpdateRequest.builder()
                .clinicalNotes("BP 120/80, Pulse 72. Clear chest examination.")
                .diagnosis("Bronchitis")
                .followUpInstructions("Take prescribed syrup for 5 days. Drink warm water.")
                .followUpDate(LocalDate.now().plusDays(7))
                .build();

        mockMvc.perform(patch("/api/consultations/" + consultationId + "/update")
                        .header(HttpHeaders.AUTHORIZATION, bearerToken(300L, "DOCTOR"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.diagnosis", is("Bronchitis")))
                .andExpect(jsonPath("$.clinicalNotes", is("BP 120/80, Pulse 72. Clear chest examination.")));

        // 4. Doctor completes consultation
        mockMvc.perform(patch("/api/consultations/" + consultationId + "/complete")
                        .header(HttpHeaders.AUTHORIZATION, bearerToken(300L, "DOCTOR")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("COMPLETED")))
                .andExpect(jsonPath("$.completedAt", notNullValue()));

        // 5. Patient views the persisted consultation (clinical notes redacted, diagnosis & follow-up visible)
        mockMvc.perform(get("/api/consultations/" + consultationId)
                        .header(HttpHeaders.AUTHORIZATION, bearerToken(200L, "PATIENT")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(consultationId.intValue())))
                .andExpect(jsonPath("$.patientId", is(200)))
                .andExpect(jsonPath("$.doctorId", is(300)))
                .andExpect(jsonPath("$.clinicalNotes", nullValue()))
                .andExpect(jsonPath("$.diagnosis", is("Bronchitis")))
                .andExpect(jsonPath("$.followUpInstructions", containsString("Take prescribed syrup")));

        // 6. The assigned doctor reads the same persisted consultation.
        mockMvc.perform(get("/api/consultations/" + consultationId)
                        .header(HttpHeaders.AUTHORIZATION, bearerToken(300L, "DOCTOR")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(consultationId.intValue())))
                .andExpect(jsonPath("$.patientId", is(200)))
                .andExpect(jsonPath("$.doctorId", is(300)))
                .andExpect(jsonPath("$.clinicalNotes", is("BP 120/80, Pulse 72. Clear chest examination.")));

        // 7. A different authenticated user cannot read the room.
        mockMvc.perform(get("/api/consultations/" + consultationId)
                        .header(HttpHeaders.AUTHORIZATION, bearerToken(999L, "PATIENT")))
                .andExpect(status().isForbidden());

        // Appointment lookup is also scoped to the patient or assigned doctor.
        mockMvc.perform(get("/api/consultations/appointment/100")
                        .header(HttpHeaders.AUTHORIZATION, bearerToken(999L, "PATIENT")))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/consultations/appointment/100")
                        .header(HttpHeaders.AUTHORIZATION, bearerToken(200L, "PATIENT")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(consultationId.intValue())));
    }

    private String bearerToken(Long userId, String role) {
        String token = Jwts.builder()
                .claims(Map.of("userId", userId, "roles", Set.of(role)))
                .subject("user-" + userId)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + 60_000))
                .signWith(Keys.hmacShaKeyFor(JWT_SECRET.getBytes(StandardCharsets.UTF_8)))
                .compact();
        return "Bearer " + token;
    }
}
