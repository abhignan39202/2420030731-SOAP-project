package com.rhc.medicineservice.service;

import com.rhc.medicineservice.client.PrescriptionClient;
import com.rhc.medicineservice.dto.*;
import com.rhc.medicineservice.entity.*;
import com.rhc.medicineservice.exception.InvalidStatusTransitionException;
import com.rhc.medicineservice.exception.ResourceNotFoundException;
import com.rhc.medicineservice.exception.UnauthorizedException;
import com.rhc.medicineservice.repository.MedicationReminderRepository;
import com.rhc.medicineservice.repository.MedicationRepository;
import com.rhc.medicineservice.repository.MedicineRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.ArgumentCaptor;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MedicineServiceTest {

    @Mock
    private MedicineRepository medicineRepository;
    @Mock
    private MedicationRepository medicationRepository;
    @Mock
    private MedicationReminderRepository reminderRepository;
    @Mock
    private PrescriptionClient prescriptionClient;

    @InjectMocks
    private MedicineService medicineService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(medicineService, "graceMinutes", 60L);
    }

    @Test
    void getAllMedicines_Success() {
        Medicine m = new Medicine();
        m.setId(1L);
        m.setName("Aspirin");
        m.setActive(true);
        when(medicineRepository.findByActiveTrue()).thenReturn(List.of(m));

        List<MedicineDTO> res = medicineService.getAllMedicines();
        assertEquals(1, res.size());
        assertEquals("Aspirin", res.get(0).getName());
    }

    @Test
    void getMedicineById_Success() {
        Medicine m = new Medicine();
        m.setId(1L);
        m.setName("Aspirin");
        when(medicineRepository.findById(1L)).thenReturn(Optional.of(m));

        MedicineDTO res = medicineService.getMedicineById(1L);
        assertEquals("Aspirin", res.getName());
    }

    @Test
    void getMedicineById_NotFound() {
        when(medicineRepository.findById(1L)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> medicineService.getMedicineById(1L));
    }

    @Test
    void createMedicationsFromPrescription_NotFinalized() {
        PrescriptionResponse pr = new PrescriptionResponse();
        pr.setStatus("DRAFT");
        when(prescriptionClient.getPrescriptionById(1L)).thenReturn(pr);
        assertThrows(InvalidStatusTransitionException.class, () -> medicineService.createMedicationsFromPrescription(1L, 50L));
    }

    @Test
    void createMedicationsFromPrescription_RejectsUnassignedDoctor() {
        PrescriptionResponse pr = new PrescriptionResponse();
        pr.setId(10L);
        pr.setPatientId(100L);
        pr.setDoctorId(51L);
        pr.setStatus("FINALIZED");
        when(prescriptionClient.getPrescriptionById(10L)).thenReturn(pr);

        assertThrows(UnauthorizedException.class,
                () -> medicineService.createMedicationsFromPrescription(10L, 50L));
        verify(medicationRepository, never()).save(any());
    }

    @Test
    void createMedicationsFromPrescription_Success() {
        PrescriptionResponse pr = new PrescriptionResponse();
        pr.setId(10L);
        pr.setPatientId(100L);
        pr.setDoctorId(50L);
        pr.setStatus("FINALIZED");
        
        PrescriptionItemResponse item = new PrescriptionItemResponse();
        item.setId(20L);
        item.setMedicineName("Med1");
        item.setDosageValue("1");
        item.setDosageUnit("Tablet");
        item.setFrequency("ONCE_DAILY");
        item.setDurationValue(5);
        item.setDurationUnit("DAYS");
        pr.setItems(List.of(item));

        when(prescriptionClient.getPrescriptionById(10L)).thenReturn(pr);
        when(medicationRepository.existsByPrescriptionItemId(20L)).thenReturn(false);
        when(medicationRepository.save(any())).thenAnswer(inv -> {
            Medication m = inv.getArgument(0);
            m.setId(30L);
            return m;
        });

        List<MedicationResponse> res = medicineService.createMedicationsFromPrescription(10L, 50L);
        assertEquals(1, res.size());
        assertEquals("Med1", res.get(0).getMedicineName());
        assertEquals(LocalDate.now(), res.get(0).getStartDate());
        assertEquals(LocalDate.now().plusDays(4), res.get(0).getEndDate());
        verify(reminderRepository).saveAll(any());
    }
    
    @Test
    void createMedicationsFromPrescription_Idempotent() {
        PrescriptionResponse pr = new PrescriptionResponse();
        pr.setId(10L);
        pr.setPatientId(100L);
        pr.setDoctorId(50L);
        pr.setStatus("FINALIZED");
        
        PrescriptionItemResponse item = new PrescriptionItemResponse();
        item.setId(20L);
        pr.setItems(List.of(item));

        when(prescriptionClient.getPrescriptionById(10L)).thenReturn(pr);
        when(medicationRepository.existsByPrescriptionItemId(20L)).thenReturn(true);
        
        List<MedicationResponse> res = medicineService.createMedicationsFromPrescription(10L, 50L);
        assertEquals(0, res.size());
        verify(medicationRepository, never()).save(any());
    }

    @Test
    void createMedicationsFromPrescription_AsNeeded() {
        PrescriptionResponse pr = new PrescriptionResponse();
        pr.setId(10L);
        pr.setPatientId(100L);
        pr.setDoctorId(50L);
        pr.setStatus("FINALIZED");
        
        PrescriptionItemResponse item = new PrescriptionItemResponse();
        item.setId(20L);
        item.setMedicineName("Med2");
        item.setDosageValue("1");
        item.setDosageUnit("Tablet");
        item.setFrequency("AS_NEEDED");
        item.setDurationValue(5);
        item.setDurationUnit("DAYS");
        pr.setItems(List.of(item));

        when(prescriptionClient.getPrescriptionById(10L)).thenReturn(pr);
        when(medicationRepository.existsByPrescriptionItemId(20L)).thenReturn(false);
        when(medicationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        medicineService.createMedicationsFromPrescription(10L, 50L);
        verify(reminderRepository, never()).saveAll(any());
    }

    @Test
    void createMedicationsFromPrescription_ThreeTimesDailyUsesPersistedScheduleTimes() {
        PrescriptionResponse pr = new PrescriptionResponse();
        pr.setId(11L);
        pr.setPatientId(100L);
        pr.setDoctorId(50L);
        pr.setStatus("FINALIZED");

        PrescriptionItemResponse item = new PrescriptionItemResponse();
        item.setId(21L);
        item.setMedicineName("Paracetamol");
        item.setDosageValue("500");
        item.setDosageUnit("mg");
        item.setFrequency("THREE_TIMES_DAILY");
        item.setDurationValue(1);
        item.setDurationUnit("DAYS");
        pr.setItems(List.of(item));

        when(prescriptionClient.getPrescriptionById(11L)).thenReturn(pr);
        when(medicationRepository.existsByPrescriptionItemId(21L)).thenReturn(false);
        when(medicationRepository.save(any())).thenAnswer(inv -> {
            Medication medication = inv.getArgument(0);
            medication.setId(31L);
            return medication;
        });

        medicineService.createMedicationsFromPrescription(11L, 50L);

        ArgumentCaptor<List<MedicationReminder>> reminders = ArgumentCaptor.forClass(List.class);
        verify(reminderRepository).saveAll(reminders.capture());
        assertEquals(3, reminders.getValue().size());
        assertEquals(java.time.LocalTime.of(8, 0), reminders.getValue().get(0).getScheduledAt().toLocalTime());
        assertEquals(java.time.LocalTime.of(14, 0), reminders.getValue().get(1).getScheduledAt().toLocalTime());
        assertEquals(java.time.LocalTime.of(20, 0), reminders.getValue().get(2).getScheduledAt().toLocalTime());
    }

    @Test
    void markReminderTaken_Success() {
        Medication m = new Medication();
        m.setDosageValue("1");
        m.setDosageUnit("mg");
        MedicationReminder r = new MedicationReminder();
        r.setId(1L);
        r.setPatientId(100L);
        r.setStatus(ReminderStatus.PENDING);
        r.setMedication(m);

        when(reminderRepository.findById(1L)).thenReturn(Optional.of(r));
        medicineService.markReminderTaken(1L, 100L);
        assertEquals(ReminderStatus.TAKEN, r.getStatus());
        assertNotNull(r.getTakenAt());
        assertNotNull(r.getAcknowledgedAt());
        verify(reminderRepository).save(r);
    }

    @Test
    void markReminderTaken_Unauthorized() {
        MedicationReminder r = new MedicationReminder();
        r.setPatientId(200L);
        when(reminderRepository.findById(1L)).thenReturn(Optional.of(r));
        assertThrows(UnauthorizedException.class, () -> medicineService.markReminderTaken(1L, 100L));
    }

    @Test
    void markReminderTaken_InvalidStatus() {
        MedicationReminder r = new MedicationReminder();
        r.setPatientId(100L);
        r.setStatus(ReminderStatus.TAKEN);
        when(reminderRepository.findById(1L)).thenReturn(Optional.of(r));
        assertThrows(InvalidStatusTransitionException.class, () -> medicineService.markReminderTaken(1L, 100L));
    }

    @Test
    void markReminderSkipped_Success() {
        Medication m = new Medication();
        m.setDosageValue("1");
        m.setDosageUnit("mg");
        MedicationReminder r = new MedicationReminder();
        r.setId(1L);
        r.setPatientId(100L);
        r.setStatus(ReminderStatus.PENDING);
        r.setMedication(m);

        when(reminderRepository.findById(1L)).thenReturn(Optional.of(r));
        medicineService.markReminderSkipped(1L, 100L);
        assertEquals(ReminderStatus.SKIPPED, r.getStatus());
        assertNotNull(r.getAcknowledgedAt());
        verify(reminderRepository).save(r);
    }

    @Test
    void getAdherenceSummary_Success() {
        Medication m = new Medication();
        m.setDosageValue("1");
        m.setDosageUnit("mg");
        MedicationReminder r1 = new MedicationReminder(); r1.setStatus(ReminderStatus.TAKEN); r1.setMedication(m);
        MedicationReminder r2 = new MedicationReminder(); r2.setStatus(ReminderStatus.MISSED); r2.setMedication(m);
        MedicationReminder r3 = new MedicationReminder(); r3.setStatus(ReminderStatus.PENDING); r3.setMedication(m);
        
        when(reminderRepository.findByPatientIdOrderByScheduledAtDesc(100L)).thenReturn(List.of(r1, r2, r3));
        
        AdherenceSummaryResponse res = medicineService.getAdherenceSummary(100L);
        assertEquals(2, res.getTotalEligible());
        assertEquals(1, res.getTakenCount());
        assertEquals(1, res.getMissedCount());
        assertEquals(1, res.getPendingCount());
        assertEquals(50.0, res.getAdherencePercentage());
    }

    @Test
    void getAdherenceSummary_NoEligible() {
        when(reminderRepository.findByPatientIdOrderByScheduledAtDesc(100L)).thenReturn(List.of());
        
        AdherenceSummaryResponse res = medicineService.getAdherenceSummary(100L);
        assertEquals(100.0, res.getAdherencePercentage());
    }

    @Test
    void updateMissedReminders() {
        MedicationReminder r = new MedicationReminder();
        r.setStatus(ReminderStatus.PENDING);
        when(reminderRepository.findByStatusAndScheduledAtBefore(eq(ReminderStatus.PENDING), any())).thenReturn(List.of(r));
        medicineService.updateMissedReminders();
        assertEquals(ReminderStatus.MISSED, r.getStatus());
        verify(reminderRepository).saveAll(any());
    }

    @Test
    void expireMedications() {
        Medication m = new Medication();
        m.setStatus(MedicationStatus.ACTIVE);
        when(medicationRepository.findByStatusAndEndDateBefore(eq(MedicationStatus.ACTIVE), any())).thenReturn(List.of(m));
        medicineService.expireMedications();
        assertEquals(MedicationStatus.COMPLETED, m.getStatus());
        verify(medicationRepository).saveAll(any());
    }
}
