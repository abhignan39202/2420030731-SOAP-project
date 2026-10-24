package com.rhc.consultationservice.service;

import com.rhc.consultationservice.client.AppointmentClient;
import com.rhc.consultationservice.client.DoctorClient;
import com.rhc.consultationservice.dto.*;
import com.rhc.consultationservice.entity.Consultation;
import com.rhc.consultationservice.entity.ConsultationStatus;
import com.rhc.consultationservice.exception.*;
import com.rhc.consultationservice.repository.ConsultationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class ConsultationService {

    private final ConsultationRepository consultationRepository;
    private final AppointmentClient appointmentClient;
    private final DoctorClient doctorClient;

    @Transactional
    public ConsultationResponse createConsultation(Long patientId, ConsultationCreateRequest request) {
        // 1. Check if a consultation already exists for this appointment
        if (consultationRepository.existsByAppointmentId(request.getAppointmentId())) {
            throw new DuplicateConsultationException("A consultation already exists for appointment ID: " + request.getAppointmentId());
        }

        // 2. Fetch & Validate Appointment via Feign
        AppointmentResponse appointment;
        try {
            appointment = appointmentClient.getAppointmentById(request.getAppointmentId());
        } catch (Exception e) {
            throw new ResourceNotFoundException("Appointment not found with ID: " + request.getAppointmentId());
        }

        if (appointment == null) {
            throw new ResourceNotFoundException("Appointment not found with ID: " + request.getAppointmentId());
        }

        if (!appointment.getPatientId().equals(patientId)) {
            throw new UnauthorizedException("Patient ID " + patientId + " does not match appointment patient ID " + appointment.getPatientId());
        }

        if (!"CONFIRMED".equalsIgnoreCase(appointment.getStatus())) {
            throw new InvalidStatusTransitionException("Cannot create consultation for appointment in status: " + appointment.getStatus() + ". Appointment must be CONFIRMED.");
        }

        // 3. Build & Save Consultation Entity
        Consultation consultation = Consultation.builder()
                .appointmentId(request.getAppointmentId())
                .patientId(patientId)
                .doctorId(appointment.getDoctorId())
                .symptoms(request.getSymptoms())
                .status(ConsultationStatus.SCHEDULED)
                .build();

        Consultation saved = consultationRepository.save(consultation);
        return mapToConsultationResponse(saved);
    }

    public ConsultationResponse getConsultationById(Long id, Long requestingUserId, boolean isDoctor) {
        Consultation consultation = getConsultationEntity(id);
        validateAccess(consultation, requestingUserId, isDoctor);
        
        ConsultationResponse response = mapToConsultationResponse(consultation);
        if (!isDoctor) {
            // Patient sees diagnosis and follow-up, but clinical notes are internal doctor notes
            response.setClinicalNotes(null);
        }
        return response;
    }

    public ConsultationSummaryResponse getPatientConsultationSummary(Long id, Long patientId) {
        Consultation consultation = getConsultationEntity(id);
        if (!consultation.getPatientId().equals(patientId)) {
            throw new UnauthorizedException("User is not authorized to view this consultation summary.");
        }
        return mapToConsultationSummaryResponse(consultation);
    }

    public List<ConsultationResponse> getConsultationsByPatient(Long patientId) {
        return consultationRepository.findByPatientId(patientId).stream()
                .map(consultation -> {
                    ConsultationResponse response = mapToConsultationResponse(consultation);
                    response.setClinicalNotes(null);
                    return response;
                })
                .toList();
    }

    public List<ConsultationResponse> getConsultationsByDoctor(Long doctorId) {
        return consultationRepository.findByDoctorId(doctorId).stream()
                .map(this::mapToConsultationResponse)
                .toList();
    }

    public ConsultationResponse getConsultationByAppointment(Long appointmentId, Long requestingUserId, boolean isDoctor) {
        Consultation consultation = consultationRepository.findByAppointmentId(appointmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Consultation not found for appointment ID: " + appointmentId));
        validateAccess(consultation, requestingUserId, isDoctor);
        ConsultationResponse response = mapToConsultationResponse(consultation);
        if (!isDoctor) response.setClinicalNotes(null);
        return response;
    }

    @Transactional
    public ConsultationResponse startConsultation(Long id, Long doctorId) {
        Consultation consultation = getConsultationEntity(id);

        if (!consultation.getDoctorId().equals(doctorId)) {
            throw new UnauthorizedException("Doctor ID " + doctorId + " is not assigned to this consultation.");
        }

        transitionStatus(consultation, ConsultationStatus.IN_PROGRESS);
        consultation.setStartedAt(LocalDateTime.now());

        Consultation saved = consultationRepository.save(consultation);
        return mapToConsultationResponse(saved);
    }

    @Transactional
    public ConsultationResponse updateConsultation(Long id, Long doctorId, ConsultationUpdateRequest request) {
        Consultation consultation = getConsultationEntity(id);

        if (!consultation.getDoctorId().equals(doctorId)) {
            throw new UnauthorizedException("Doctor ID " + doctorId + " is not assigned to this consultation.");
        }

        if (consultation.getStatus() != ConsultationStatus.IN_PROGRESS) {
            throw new InvalidStatusTransitionException("Cannot update consultation that is in status: " + consultation.getStatus() + ". Must be IN_PROGRESS.");
        }

        if (request.getSymptoms() != null) {
            consultation.setSymptoms(request.getSymptoms());
        }
        if (request.getClinicalNotes() != null) {
            consultation.setClinicalNotes(request.getClinicalNotes());
        }
        if (request.getDiagnosis() != null) {
            consultation.setDiagnosis(request.getDiagnosis());
        }
        if (request.getFollowUpInstructions() != null) {
            consultation.setFollowUpInstructions(request.getFollowUpInstructions());
        }
        if (request.getFollowUpDate() != null) {
            consultation.setFollowUpDate(request.getFollowUpDate());
        }

        Consultation saved = consultationRepository.save(consultation);
        return mapToConsultationResponse(saved);
    }

    @Transactional
    public ConsultationResponse completeConsultation(Long id, Long doctorId) {
        Consultation consultation = getConsultationEntity(id);

        if (!consultation.getDoctorId().equals(doctorId)) {
            throw new UnauthorizedException("Doctor ID " + doctorId + " is not assigned to this consultation.");
        }

        if (consultation.getSymptoms() == null || consultation.getSymptoms().isBlank()) {
            throw new IllegalArgumentException("Symptoms must be recorded before completing consultation.");
        }

        if (consultation.getDiagnosis() == null || consultation.getDiagnosis().isBlank()) {
            throw new IllegalArgumentException("Diagnosis must be recorded before completing consultation.");
        }

        transitionStatus(consultation, ConsultationStatus.COMPLETED);
        consultation.setCompletedAt(LocalDateTime.now());

        Consultation saved = consultationRepository.save(consultation);

        // Notify Appointment Service to mark appointment COMPLETED via Feign
        try {
            appointmentClient.completeAppointment(saved.getAppointmentId());
        } catch (Exception e) {
            log.warn("Unable to update appointment status to COMPLETED for appointment ID {}: {}", saved.getAppointmentId(), e.getMessage());
        }

        return mapToConsultationResponse(saved);
    }

    @Transactional
    public ConsultationResponse cancelConsultation(Long id, Long userId) {
        Consultation consultation = getConsultationEntity(id);

        if (!consultation.getPatientId().equals(userId) && !consultation.getDoctorId().equals(userId)) {
            throw new UnauthorizedException("User ID " + userId + " is not authorized to cancel this consultation.");
        }

        transitionStatus(consultation, ConsultationStatus.CANCELLED);
        Consultation saved = consultationRepository.save(consultation);
        return mapToConsultationResponse(saved);
    }

    // ==========================================
    // HELPER METHODS
    // ==========================================

    private Consultation getConsultationEntity(Long id) {
        return consultationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Consultation not found with ID: " + id));
    }

    private void transitionStatus(Consultation consultation, ConsultationStatus targetStatus) {
        if (!consultation.getStatus().canTransitionTo(targetStatus)) {
            throw new InvalidStatusTransitionException(
                    "Invalid status transition from " + consultation.getStatus() + " to " + targetStatus
            );
        }
        consultation.setStatus(targetStatus);
    }

    private void validateAccess(Consultation consultation, Long userId, boolean isDoctor) {
        if (isDoctor && consultation.getDoctorId().equals(userId)) {
            return;
        }
        if (!isDoctor && consultation.getPatientId().equals(userId)) {
            return;
        }
        throw new UnauthorizedException("User ID " + userId + " is not authorized to access this consultation.");
    }

    private ConsultationResponse mapToConsultationResponse(Consultation c) {
        ConsultationResponse res = ConsultationResponse.builder()
                .id(c.getId())
                .appointmentId(c.getAppointmentId())
                .patientId(c.getPatientId())
                .doctorId(c.getDoctorId())
                .symptoms(c.getSymptoms())
                .clinicalNotes(c.getClinicalNotes())
                .diagnosis(c.getDiagnosis())
                .followUpInstructions(c.getFollowUpInstructions())
                .followUpDate(c.getFollowUpDate())
                .status(c.getStatus())
                .startedAt(c.getStartedAt())
                .completedAt(c.getCompletedAt())
                .createdAt(c.getCreatedAt())
                .updatedAt(c.getUpdatedAt())
                .build();

        // Enrich with doctor name if possible
        try {
            DoctorProfileResponse doctor = doctorClient.getDoctorById(c.getDoctorId());
            if (doctor != null) {
                res.setDoctorName(doctor.getFullName());
            }
        } catch (Exception ignored) {}

        return res;
    }

    private ConsultationSummaryResponse mapToConsultationSummaryResponse(Consultation c) {
        ConsultationSummaryResponse res = ConsultationSummaryResponse.builder()
                .id(c.getId())
                .appointmentId(c.getAppointmentId())
                .patientId(c.getPatientId())
                .doctorId(c.getDoctorId())
                .symptoms(c.getSymptoms())
                .diagnosis(c.getDiagnosis())
                .followUpInstructions(c.getFollowUpInstructions())
                .followUpDate(c.getFollowUpDate())
                .status(c.getStatus())
                .startedAt(c.getStartedAt())
                .completedAt(c.getCompletedAt())
                .createdAt(c.getCreatedAt())
                .build();

        try {
            DoctorProfileResponse doctor = doctorClient.getDoctorById(c.getDoctorId());
            if (doctor != null) {
                res.setDoctorName(doctor.getFullName());
            }
        } catch (Exception ignored) {}

        return res;
    }
}
