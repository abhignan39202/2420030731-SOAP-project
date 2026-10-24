package com.rhc.consultationservice.service;

import com.rhc.consultationservice.client.AppointmentClient;
import com.rhc.consultationservice.client.DoctorClient;
import com.rhc.consultationservice.dto.*;
import com.rhc.consultationservice.entity.Consultation;
import com.rhc.consultationservice.entity.ConsultationStatus;
import com.rhc.consultationservice.exception.*;
import com.rhc.consultationservice.repository.ConsultationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ConsultationServiceTest {

    @Mock
    private ConsultationRepository consultationRepository;

    @Mock
    private AppointmentClient appointmentClient;

    @Mock
    private DoctorClient doctorClient;

    @InjectMocks
    private ConsultationService consultationService;

    private AppointmentResponse mockAppointment;
    private DoctorProfileResponse mockDoctor;
    private Consultation mockConsultation;

    @BeforeEach
    void setUp() {
        mockAppointment = AppointmentResponse.builder()
                .id(10L)
                .patientId(100L)
                .doctorId(1L)
                .appointmentDate(LocalDate.now().plusDays(1))
                .startTime(LocalTime.of(10, 0))
                .endTime(LocalTime.of(10, 30))
                .status("CONFIRMED")
                .reason("Fever and cold")
                .build();

        mockDoctor = DoctorProfileResponse.builder()
                .userId(1L)
                .fullName("Dr. Anil Kumar")
                .specialization("General Physician")
                .status("APPROVED")
                .isAvailable(true)
                .build();

        mockConsultation = Consultation.builder()
                .id(1L)
                .appointmentId(10L)
                .patientId(100L)
                .doctorId(1L)
                .symptoms("Fever and severe headache")
                .status(ConsultationStatus.SCHEDULED)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
    }

    @Test
    @DisplayName("1. Create Consultation - Success")
    void createConsultation_Success() {
        ConsultationCreateRequest req = ConsultationCreateRequest.builder()
                .appointmentId(10L)
                .symptoms("Fever and severe headache")
                .build();

        when(consultationRepository.existsByAppointmentId(10L)).thenReturn(false);
        when(appointmentClient.getAppointmentById(10L)).thenReturn(mockAppointment);
        when(consultationRepository.save(any(Consultation.class))).thenReturn(mockConsultation);
        when(doctorClient.getDoctorById(1L)).thenReturn(mockDoctor);

        ConsultationResponse response = consultationService.createConsultation(100L, req);

        assertNotNull(response);
        assertEquals(1L, response.getId());
        assertEquals(10L, response.getAppointmentId());
        assertEquals(100L, response.getPatientId());
        assertEquals(1L, response.getDoctorId());
        assertEquals(ConsultationStatus.SCHEDULED, response.getStatus());
        assertEquals("Dr. Anil Kumar", response.getDoctorName());

        verify(consultationRepository).save(any(Consultation.class));
    }

    @Test
    @DisplayName("2. Reject Create Consultation - Duplicate Consultation")
    void createConsultation_Duplicate() {
        ConsultationCreateRequest req = ConsultationCreateRequest.builder()
                .appointmentId(10L)
                .symptoms("Fever")
                .build();

        when(consultationRepository.existsByAppointmentId(10L)).thenReturn(true);

        assertThrows(DuplicateConsultationException.class, () ->
                consultationService.createConsultation(100L, req));
    }

    @Test
    @DisplayName("3. Reject Create Consultation - Appointment Not Found")
    void createConsultation_AppointmentNotFound() {
        ConsultationCreateRequest req = ConsultationCreateRequest.builder()
                .appointmentId(999L)
                .symptoms("Fever")
                .build();

        when(consultationRepository.existsByAppointmentId(999L)).thenReturn(false);
        when(appointmentClient.getAppointmentById(999L)).thenThrow(new RuntimeException("Not found"));

        assertThrows(ResourceNotFoundException.class, () ->
                consultationService.createConsultation(100L, req));
    }

    @Test
    @DisplayName("4. Reject Create Consultation - Unconfirmed Appointment")
    void createConsultation_UnconfirmedAppointment() {
        mockAppointment.setStatus("REQUESTED");

        ConsultationCreateRequest req = ConsultationCreateRequest.builder()
                .appointmentId(10L)
                .symptoms("Fever")
                .build();

        when(consultationRepository.existsByAppointmentId(10L)).thenReturn(false);
        when(appointmentClient.getAppointmentById(10L)).thenReturn(mockAppointment);

        assertThrows(InvalidStatusTransitionException.class, () ->
                consultationService.createConsultation(100L, req));
    }

    @Test
    @DisplayName("5. Reject Create Consultation - Unauthorized Patient")
    void createConsultation_UnauthorizedPatient() {
        ConsultationCreateRequest req = ConsultationCreateRequest.builder()
                .appointmentId(10L)
                .symptoms("Fever")
                .build();

        when(consultationRepository.existsByAppointmentId(10L)).thenReturn(false);
        when(appointmentClient.getAppointmentById(10L)).thenReturn(mockAppointment);

        assertThrows(UnauthorizedException.class, () ->
                consultationService.createConsultation(999L, req)); // Patient ID 999 mismatch
    }

    @Test
    @DisplayName("6. Start Consultation - Success")
    void startConsultation_Success() {
        when(consultationRepository.findById(1L)).thenReturn(Optional.of(mockConsultation));
        when(consultationRepository.save(any(Consultation.class))).thenAnswer(i -> i.getArguments()[0]);

        ConsultationResponse response = consultationService.startConsultation(1L, 1L);

        assertEquals(ConsultationStatus.IN_PROGRESS, response.getStatus());
        assertNotNull(response.getStartedAt());
    }

    @Test
    @DisplayName("7. Reject Start Consultation - Unauthorized Doctor")
    void startConsultation_UnauthorizedDoctor() {
        when(consultationRepository.findById(1L)).thenReturn(Optional.of(mockConsultation));

        assertThrows(UnauthorizedException.class, () ->
                consultationService.startConsultation(1L, 999L));
    }

    @Test
    @DisplayName("8. Update Consultation Clinical Notes - Success")
    void updateConsultation_Success() {
        mockConsultation.setStatus(ConsultationStatus.IN_PROGRESS);

        ConsultationUpdateRequest req = ConsultationUpdateRequest.builder()
                .clinicalNotes("Patient has high fever 102F")
                .diagnosis("Viral fever")
                .followUpInstructions("Rest and take paracetamol 500mg")
                .build();

        when(consultationRepository.findById(1L)).thenReturn(Optional.of(mockConsultation));
        when(consultationRepository.save(any(Consultation.class))).thenAnswer(i -> i.getArguments()[0]);

        ConsultationResponse response = consultationService.updateConsultation(1L, 1L, req);

        assertEquals("Patient has high fever 102F", response.getClinicalNotes());
        assertEquals("Viral fever", response.getDiagnosis());
        assertEquals("Rest and take paracetamol 500mg", response.getFollowUpInstructions());
    }

    @Test
    @DisplayName("9. Reject Update Consultation - Not IN_PROGRESS")
    void updateConsultation_InvalidState() {
        mockConsultation.setStatus(ConsultationStatus.SCHEDULED);

        ConsultationUpdateRequest req = ConsultationUpdateRequest.builder()
                .diagnosis("Viral fever")
                .build();

        when(consultationRepository.findById(1L)).thenReturn(Optional.of(mockConsultation));

        assertThrows(InvalidStatusTransitionException.class, () ->
                consultationService.updateConsultation(1L, 1L, req));
    }

    @Test
    @DisplayName("10. Complete Consultation - Success")
    void completeConsultation_Success() {
        mockConsultation.setStatus(ConsultationStatus.IN_PROGRESS);
        mockConsultation.setSymptoms("Fever and headache");
        mockConsultation.setDiagnosis("Viral Infection");

        when(consultationRepository.findById(1L)).thenReturn(Optional.of(mockConsultation));
        when(consultationRepository.save(any(Consultation.class))).thenAnswer(i -> i.getArguments()[0]);

        ConsultationResponse response = consultationService.completeConsultation(1L, 1L);

        assertEquals(ConsultationStatus.COMPLETED, response.getStatus());
        assertNotNull(response.getCompletedAt());
        verify(appointmentClient).completeAppointment(10L);
    }

    @Test
    @DisplayName("11. Reject Complete Consultation - Missing Diagnosis")
    void completeConsultation_MissingDiagnosis() {
        mockConsultation.setStatus(ConsultationStatus.IN_PROGRESS);
        mockConsultation.setSymptoms("Fever and headache");
        mockConsultation.setDiagnosis(null); // Missing

        when(consultationRepository.findById(1L)).thenReturn(Optional.of(mockConsultation));

        assertThrows(IllegalArgumentException.class, () ->
                consultationService.completeConsultation(1L, 1L));
    }

    @Test
    @DisplayName("12. Cancel Consultation - Success")
    void cancelConsultation_Success() {
        when(consultationRepository.findById(1L)).thenReturn(Optional.of(mockConsultation));
        when(consultationRepository.save(any(Consultation.class))).thenAnswer(i -> i.getArguments()[0]);

        ConsultationResponse response = consultationService.cancelConsultation(1L, 100L); // Patient cancels

        assertEquals(ConsultationStatus.CANCELLED, response.getStatus());
    }

    @Test
    @DisplayName("13. Patient View - Clinical Notes Redacted")
    void getConsultationById_PatientViewRedacted() {
        mockConsultation.setClinicalNotes("CONFIDENTIAL INTERNAL DOCTOR NOTES");
        mockConsultation.setDiagnosis("Viral Fever");

        when(consultationRepository.findById(1L)).thenReturn(Optional.of(mockConsultation));

        ConsultationResponse response = consultationService.getConsultationById(1L, 100L, false);

        assertNull(response.getClinicalNotes()); // Redacted for patient
        assertEquals("Viral Fever", response.getDiagnosis());
    }

    @Test
    @DisplayName("14. Doctor View - Clinical Notes Visible")
    void getConsultationById_DoctorViewVisible() {
        mockConsultation.setClinicalNotes("CONFIDENTIAL INTERNAL DOCTOR NOTES");
        mockConsultation.setDiagnosis("Viral Fever");

        when(consultationRepository.findById(1L)).thenReturn(Optional.of(mockConsultation));

        ConsultationResponse response = consultationService.getConsultationById(1L, 1L, true);

        assertEquals("CONFIDENTIAL INTERNAL DOCTOR NOTES", response.getClinicalNotes());
        assertEquals("Viral Fever", response.getDiagnosis());
    }
}
