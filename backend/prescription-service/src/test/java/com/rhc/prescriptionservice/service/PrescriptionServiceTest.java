package com.rhc.prescriptionservice.service;

import com.rhc.prescriptionservice.client.ConsultationClient;
import com.rhc.prescriptionservice.client.MedicineScheduleClient;
import com.rhc.prescriptionservice.dto.ConsultationResponse;
import com.rhc.prescriptionservice.dto.PrescriptionCreateRequest;
import com.rhc.prescriptionservice.dto.PrescriptionItemRequest;
import com.rhc.prescriptionservice.dto.PrescriptionResponse;
import com.rhc.prescriptionservice.entity.DurationUnit;
import com.rhc.prescriptionservice.entity.Frequency;
import com.rhc.prescriptionservice.entity.Prescription;
import com.rhc.prescriptionservice.entity.PrescriptionStatus;
import com.rhc.prescriptionservice.exception.DuplicatePrescriptionException;
import com.rhc.prescriptionservice.exception.InvalidStatusTransitionException;
import com.rhc.prescriptionservice.exception.ResourceNotFoundException;
import com.rhc.prescriptionservice.exception.UnauthorizedException;
import com.rhc.prescriptionservice.repository.PrescriptionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class PrescriptionServiceTest {

    @Mock
    private PrescriptionRepository prescriptionRepository;

    @Mock
    private ConsultationClient consultationClient;

    @Mock
    private MedicineScheduleClient medicineScheduleClient;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    @InjectMocks
    private PrescriptionService prescriptionService;

    private PrescriptionCreateRequest validRequest;
    private ConsultationResponse validConsultation;
    private Prescription draftPrescription;
    private Prescription finalizedPrescription;

    @BeforeEach
    void setUp() {
        PrescriptionItemRequest item = PrescriptionItemRequest.builder()
                .medicineName("Paracetamol")
                .dosageValue("500")
                .dosageUnit("mg")
                .frequency(Frequency.TWICE_DAILY)
                .durationValue(5)
                .durationUnit(DurationUnit.DAYS)
                .build();

        validRequest = PrescriptionCreateRequest.builder()
                .consultationId(10L)
                .generalInstructions("Rest")
                .items(List.of(item))
                .build();

        validConsultation = ConsultationResponse.builder()
                .id(10L)
                .patientId(100L)
                .doctorId(200L)
                .status("COMPLETED")
                .diagnosis("Fever")
                .build();

        draftPrescription = Prescription.builder()
                .id(1L)
                .consultationId(10L)
                .patientId(100L)
                .doctorId(200L)
                .status(PrescriptionStatus.DRAFT)
                .diagnosis("Fever")
                .build();

        finalizedPrescription = Prescription.builder()
                .id(2L)
                .consultationId(11L)
                .patientId(100L)
                .doctorId(200L)
                .status(PrescriptionStatus.FINALIZED)
                .diagnosis("Cold")
                .build();
    }

    // 1. Create prescription - success
    @Test
    void testCreatePrescriptionSuccess() {
        when(prescriptionRepository.existsByConsultationId(10L)).thenReturn(false);
        when(consultationClient.getConsultationById(10L)).thenReturn(validConsultation);
        when(prescriptionRepository.save(any(Prescription.class))).thenAnswer(i -> {
            Prescription p = i.getArgument(0);
            p.setId(1L);
            return p;
        });

        PrescriptionResponse response = prescriptionService.createPrescription(200L, validRequest);

        assertNotNull(response);
        assertEquals(1L, response.getId());
        assertEquals(10L, response.getConsultationId());
        assertEquals(PrescriptionStatus.DRAFT, response.getStatus());
    }

    // 2. Reject - duplicate prescription for same consultation
    @Test
    void testCreatePrescriptionDuplicate() {
        when(prescriptionRepository.existsByConsultationId(10L)).thenReturn(true);

        assertThrows(DuplicatePrescriptionException.class, () -> 
            prescriptionService.createPrescription(200L, validRequest)
        );
    }

    // 3. Reject - consultation not found
    @Test
    void testCreatePrescriptionConsultationNotFound() {
        when(prescriptionRepository.existsByConsultationId(10L)).thenReturn(false);
        when(consultationClient.getConsultationById(10L)).thenReturn(null);

        assertThrows(ResourceNotFoundException.class, () -> 
            prescriptionService.createPrescription(200L, validRequest)
        );
    }

    // 4. Reject - consultation not COMPLETED
    @Test
    void testCreatePrescriptionConsultationNotCompleted() {
        validConsultation.setStatus("IN_PROGRESS");
        when(prescriptionRepository.existsByConsultationId(10L)).thenReturn(false);
        when(consultationClient.getConsultationById(10L)).thenReturn(validConsultation);

        assertThrows(InvalidStatusTransitionException.class, () -> 
            prescriptionService.createPrescription(200L, validRequest)
        );
    }

    // 5. Reject - doctor mismatch
    @Test
    void testCreatePrescriptionDoctorMismatch() {
        when(prescriptionRepository.existsByConsultationId(10L)).thenReturn(false);
        when(consultationClient.getConsultationById(10L)).thenReturn(validConsultation);

        assertThrows(UnauthorizedException.class, () -> 
            prescriptionService.createPrescription(201L, validRequest)
        );
    }

    // 6. Finalize prescription - success
    @Test
    void testFinalizePrescriptionSuccess() {
        when(prescriptionRepository.findById(1L)).thenReturn(Optional.of(draftPrescription));
        when(prescriptionRepository.save(any())).thenReturn(draftPrescription);

        PrescriptionResponse response = prescriptionService.finalizePrescription(1L, 200L);

        assertEquals(PrescriptionStatus.FINALIZED, response.getStatus());
        assertNotNull(response.getIssuedAt());
        verify(eventPublisher).publishEvent(any(Object.class));
    }

    // 7. Reject finalize - not DRAFT
    @Test
    void testFinalizePrescriptionNotDraft() {
        when(prescriptionRepository.findById(2L)).thenReturn(Optional.of(finalizedPrescription));

        assertThrows(InvalidStatusTransitionException.class, () -> 
            prescriptionService.finalizePrescription(2L, 200L)
        );
    }

    // 8. Reject finalize - wrong doctor
    @Test
    void testFinalizePrescriptionWrongDoctor() {
        when(prescriptionRepository.findById(1L)).thenReturn(Optional.of(draftPrescription));

        assertThrows(UnauthorizedException.class, () -> 
            prescriptionService.finalizePrescription(1L, 201L)
        );
    }

    // 9. Cancel DRAFT - success
    @Test
    void testCancelDraftPrescriptionSuccess() {
        when(prescriptionRepository.findById(1L)).thenReturn(Optional.of(draftPrescription));
        when(prescriptionRepository.save(any())).thenReturn(draftPrescription);

        PrescriptionResponse response = prescriptionService.cancelPrescription(1L, 200L);

        assertEquals(PrescriptionStatus.CANCELLED, response.getStatus());
    }

    // 10. Cancel FINALIZED - success
    @Test
    void testCancelFinalizedPrescriptionSuccess() {
        when(prescriptionRepository.findById(2L)).thenReturn(Optional.of(finalizedPrescription));
        when(prescriptionRepository.save(any())).thenReturn(finalizedPrescription);

        PrescriptionResponse response = prescriptionService.cancelPrescription(2L, 200L);

        assertEquals(PrescriptionStatus.CANCELLED, response.getStatus());
    }

    // 11. Reject cancel - already cancelled
    @Test
    void testCancelPrescriptionAlreadyCancelled() {
        draftPrescription.setStatus(PrescriptionStatus.CANCELLED);
        when(prescriptionRepository.findById(1L)).thenReturn(Optional.of(draftPrescription));

        assertThrows(InvalidStatusTransitionException.class, () -> 
            prescriptionService.cancelPrescription(1L, 200L)
        );
    }

    // 12. Update draft - success
    @Test
    void testUpdateDraftSuccess() {
        when(prescriptionRepository.findById(1L)).thenReturn(Optional.of(draftPrescription));
        when(prescriptionRepository.save(any())).thenReturn(draftPrescription);

        PrescriptionResponse response = prescriptionService.updateDraftPrescription(1L, 200L, validRequest);

        assertEquals(PrescriptionStatus.DRAFT, response.getStatus());
    }

    // 13. Reject update - not DRAFT
    @Test
    void testUpdateNotDraft() {
        when(prescriptionRepository.findById(2L)).thenReturn(Optional.of(finalizedPrescription));

        assertThrows(InvalidStatusTransitionException.class, () -> 
            prescriptionService.updateDraftPrescription(2L, 200L, validRequest)
        );
    }

    // 14. Patient view own prescription - success
    @Test
    void testPatientViewOwnPrescription() {
        when(prescriptionRepository.findById(1L)).thenReturn(Optional.of(draftPrescription));

        PrescriptionResponse response = prescriptionService.getPrescriptionById(1L, 100L, false);

        assertNotNull(response);
    }

    // 15. Reject patient view other's prescription
    @Test
    void testPatientViewOtherPrescription() {
        when(prescriptionRepository.findById(1L)).thenReturn(Optional.of(draftPrescription));

        assertThrows(UnauthorizedException.class, () -> 
            prescriptionService.getPrescriptionById(1L, 101L, false)
        );
    }

    // 16. Doctor view own prescription - success
    @Test
    void testDoctorViewOwnPrescription() {
        when(prescriptionRepository.findById(1L)).thenReturn(Optional.of(draftPrescription));

        PrescriptionResponse response = prescriptionService.getPrescriptionById(1L, 200L, true);

        assertNotNull(response);
    }
}
