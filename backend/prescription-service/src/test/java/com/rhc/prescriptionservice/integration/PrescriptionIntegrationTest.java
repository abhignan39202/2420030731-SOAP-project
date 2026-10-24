package com.rhc.prescriptionservice.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rhc.prescriptionservice.client.ConsultationClient;
import com.rhc.prescriptionservice.client.MedicineScheduleClient;
import com.rhc.prescriptionservice.dto.ConsultationResponse;
import com.rhc.prescriptionservice.dto.PrescriptionCreateRequest;
import com.rhc.prescriptionservice.dto.PrescriptionItemRequest;
import com.rhc.prescriptionservice.entity.DurationUnit;
import com.rhc.prescriptionservice.entity.Frequency;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.List;
import java.util.Date;
import java.util.Map;
import java.util.Set;
import java.nio.charset.StandardCharsets;

import static org.mockito.Mockito.timeout;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class PrescriptionIntegrationTest {

    private static final String JWT_SECRET = "404E635266556A586E3272357538782F413F4528462B4B6250645367566B5970";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private ConsultationClient consultationClient;

    @MockBean
    private MedicineScheduleClient medicineScheduleClient;

    private PrescriptionCreateRequest request;
    private ConsultationResponse consultationResponse;

    @BeforeEach
    void setUp() {
        PrescriptionItemRequest item = PrescriptionItemRequest.builder()
                .medicineName("Amoxicillin")
                .dosageValue("500")
                .dosageUnit("mg")
                .frequency(Frequency.THREE_TIMES_DAILY)
                .durationValue(7)
                .durationUnit(DurationUnit.DAYS)
                .route("Oral")
                .build();

        request = PrescriptionCreateRequest.builder()
                .consultationId(50L)
                .generalInstructions("Drink plenty of fluids")
                .items(List.of(item))
                .build();

        consultationResponse = ConsultationResponse.builder()
                .id(50L)
                .patientId(10L)
                .doctorId(20L)
                .status("COMPLETED")
                .diagnosis("Bacterial Infection")
                .build();
    }

    @Test
    void missingOrInvalidBearerTokenReturnsUnauthorized() throws Exception {
        mockMvc.perform(get("/api/prescriptions/1"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/prescriptions/1")
                        .header("Authorization", "Bearer invalid-token"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void testFullPrescriptionLifecycle() throws Exception {
        // Mock the Feign client
        when(consultationClient.getConsultationById(50L)).thenReturn(consultationResponse);

        // 1. Create Prescription
        MvcResult createResult = mockMvc.perform(post("/api/prescriptions")
                .header("Authorization", bearerToken(20L, "DOCTOR"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("DRAFT"))
                .andExpect(jsonPath("$.consultationId").value(50))
                .andReturn();

        String responseStr = createResult.getResponse().getContentAsString();
        Long prescriptionId = objectMapper.readTree(responseStr).get("id").asLong();

        // 2. Update Draft
        request.setGeneralInstructions("Updated instructions");
        mockMvc.perform(put("/api/prescriptions/" + prescriptionId)
                .header("Authorization", bearerToken(20L, "DOCTOR"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.generalInstructions").value("Updated instructions"));

        // 3. Finalize Prescription
        mockMvc.perform(patch("/api/prescriptions/" + prescriptionId + "/finalize")
                .header("Authorization", bearerToken(20L, "DOCTOR")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("FINALIZED"));
        verify(medicineScheduleClient, timeout(1000)).createMedicationsFromPrescription(prescriptionId);

        // 4. Patient Views Prescription
        mockMvc.perform(get("/api/prescriptions/" + prescriptionId)
                .header("Authorization", bearerToken(10L, "PATIENT")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.patientId").value(10));

        mockMvc.perform(get("/api/prescriptions/consultation/50")
                .header("Authorization", bearerToken(10L, "PATIENT")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(prescriptionId));

        mockMvc.perform(get("/api/prescriptions/consultation/50")
                .header("Authorization", bearerToken(999L, "PATIENT")))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/prescriptions/" + prescriptionId)
                        .header("Authorization", bearerToken(999L, "PATIENT"))
                        .header("X-User-Id", "10")
                        .header("X-User-Roles", "PATIENT"))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/prescriptions/" + prescriptionId)
                        .header("Authorization", bearerToken(999L, "ADMIN")))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/prescriptions/scan/drafts")
                        .header("Authorization", bearerToken(999L, "NOTPATIENT")))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/prescriptions/doctor/20")
                        .header("Authorization", bearerToken(999L, "DOCTOR")))
                .andExpect(status().isForbidden());

        // 5. Cannot modify finalized prescription
        mockMvc.perform(put("/api/prescriptions/" + prescriptionId)
                .header("Authorization", bearerToken(20L, "DOCTOR"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    private String bearerToken(Long userId, String role) {
        return "Bearer " + Jwts.builder().claims(Map.of("userId", userId, "roles", Set.of(role)))
                .subject("user-" + userId).issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + 60_000))
                .signWith(Keys.hmacShaKeyFor(JWT_SECRET.getBytes(StandardCharsets.UTF_8))).compact();
    }
}
