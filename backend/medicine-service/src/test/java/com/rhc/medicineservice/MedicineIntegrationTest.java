package com.rhc.medicineservice;

import com.rhc.medicineservice.client.PrescriptionClient;
import com.rhc.medicineservice.dto.PrescriptionItemResponse;
import com.rhc.medicineservice.dto.PrescriptionResponse;
import com.rhc.medicineservice.entity.DurationUnit;
import com.rhc.medicineservice.entity.Frequency;
import com.rhc.medicineservice.entity.Medication;
import com.rhc.medicineservice.entity.MedicationReminder;
import com.rhc.medicineservice.entity.ReminderStatus;
import com.rhc.medicineservice.repository.MedicationReminderRepository;
import com.rhc.medicineservice.repository.MedicationRepository;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Date;
import java.util.Map;
import java.util.Set;
import java.nio.charset.StandardCharsets;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class MedicineIntegrationTest {

    private static final String JWT_SECRET = "404E635266556A586E3272357538782F413F4528462B4B6250645367566B5970";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private MedicationReminderRepository reminderRepository;

    @Autowired
    private MedicationRepository medicationRepository;

    @MockitoBean
    private PrescriptionClient prescriptionClient;

    @BeforeEach
    void clearMedicationData() {
        reminderRepository.deleteAll();
        medicationRepository.deleteAll();
    }

    @Test
    void completeMedicationLifecycle() throws Exception {
        // 1. Setup mock for prescription client
        PrescriptionResponse pr = new PrescriptionResponse();
        pr.setId(99L);
        pr.setPatientId(200L);
        pr.setDoctorId(300L);
        pr.setStatus("FINALIZED");
        
        PrescriptionItemResponse item = new PrescriptionItemResponse();
        item.setId(999L);
        item.setMedicineName("TestMed");
        item.setDosageValue("1");
        item.setDosageUnit("Tablet");
        item.setFrequency("ONCE_DAILY");
        item.setDurationValue(3);
        item.setDurationUnit("DAYS");
        pr.setItems(List.of(item));

        when(prescriptionClient.getPrescriptionById(99L)).thenReturn(pr);

        // 2. Create medications from prescription
        mockMvc.perform(post("/api/medicines/from-prescription/99")
                        .header("Authorization", bearerToken(300L, "DOCTOR")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].medicineName").value("TestMed"));

        // Verify entities created
        List<Medication> meds = medicationRepository.findAll();
        org.junit.jupiter.api.Assertions.assertEquals(1, meds.size());
        
        List<MedicationReminder> reminders = reminderRepository.findAll();
        org.junit.jupiter.api.Assertions.assertEquals(3, reminders.size());
        org.junit.jupiter.api.Assertions.assertEquals(99L, reminders.get(0).getPrescriptionId());
        org.junit.jupiter.api.Assertions.assertEquals(meds.get(0).getId(), reminders.get(0).getMedicineId());
        org.junit.jupiter.api.Assertions.assertNotNull(reminders.get(0).getScheduledAt());

        // 3. Get Today's reminders
        mockMvc.perform(get("/api/medicines/today")
                        .header("Authorization", bearerToken(200L, "PATIENT")))
                .andExpect(status().isOk());

        // 4. Mark Reminder Taken
        Long reminderId = reminders.get(0).getId();
        mockMvc.perform(patch("/api/medicines/reminders/" + reminderId + "/taken")
                        .header("Authorization", bearerToken(200L, "PATIENT")))
                .andExpect(status().isOk());

        MedicationReminder updatedReminder = reminderRepository.findById(reminderId).get();
        org.junit.jupiter.api.Assertions.assertEquals(ReminderStatus.TAKEN, updatedReminder.getStatus());
        org.junit.jupiter.api.Assertions.assertNotNull(updatedReminder.getTakenAt());

        // 5. Adherence Summary
        mockMvc.perform(get("/api/medicines/adherence")
                        .header("Authorization", bearerToken(200L, "PATIENT")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.takenCount").value(1))
                .andExpect(jsonPath("$.adherencePercentage").value(100.0));
    }

    @Test
    void roleNameContainingPatientDoesNotGrantMedicationAccess() throws Exception {
        mockMvc.perform(get("/api/medicines/today")
                        .header("Authorization", bearerToken(200L, "NOTPATIENT")))
                .andExpect(status().isForbidden());
    }

    @Test
    void scheduleGenerationRejectsPatientCaller() throws Exception {
        mockMvc.perform(post("/api/medicines/from-prescription/99")
                        .header("Authorization", bearerToken(200L, "PATIENT")))
                .andExpect(status().isForbidden());
    }

    @Test
    void patientCannotUseIdentityHeadersToReadAnotherPatientsMedicationRecords() throws Exception {
        Medication otherPatientsMedication = medicationRepository.saveAndFlush(Medication.builder()
                .patientId(999L)
                .prescriptionId(88L)
                .prescriptionItemId(889L)
                .medicineName("Private medicine")
                .dosageValue("1")
                .dosageUnit("tablet")
                .frequency(Frequency.ONCE_DAILY)
                .durationValue(1)
                .durationUnit(DurationUnit.DAYS)
                .startDate(java.time.LocalDate.now())
                .endDate(java.time.LocalDate.now())
                .build());
        reminderRepository.saveAndFlush(com.rhc.medicineservice.entity.MedicationReminder.builder()
                .medication(otherPatientsMedication)
                .patientId(999L)
                .prescriptionId(88L)
                .medicineId(otherPatientsMedication.getId())
                .scheduledAt(java.time.LocalDateTime.now().plusHours(1))
                .build());

        mockMvc.perform(get("/api/medications")
                        .header("Authorization", bearerToken(200L, "PATIENT"))
                        .header("X-User-Id", "999"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", org.hamcrest.Matchers.empty()));

        mockMvc.perform(get("/api/medications/" + otherPatientsMedication.getId())
                        .header("Authorization", bearerToken(200L, "PATIENT"))
                        .header("X-User-Id", "999"))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/medicines/reminders")
                        .header("Authorization", bearerToken(200L, "PATIENT"))
                        .header("X-User-Id", "999"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", org.hamcrest.Matchers.empty()));
    }

    private String bearerToken(Long userId, String role) {
        return "Bearer " + Jwts.builder().claims(Map.of("userId", userId, "roles", Set.of(role)))
                .subject("user-" + userId).issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + 60_000))
                .signWith(Keys.hmacShaKeyFor(JWT_SECRET.getBytes(StandardCharsets.UTF_8))).compact();
    }
}
