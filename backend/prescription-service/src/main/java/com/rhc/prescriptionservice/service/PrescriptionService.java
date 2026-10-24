package com.rhc.prescriptionservice.service;

import com.rhc.prescriptionservice.client.ConsultationClient;
import com.rhc.prescriptionservice.client.MedicineScheduleClient;
import com.rhc.prescriptionservice.dto.*;
import com.rhc.prescriptionservice.entity.Prescription;
import com.rhc.prescriptionservice.entity.PrescriptionItem;
import com.rhc.prescriptionservice.entity.PrescriptionStatus;
import com.rhc.prescriptionservice.event.PrescriptionFinalizedEvent;
import com.rhc.prescriptionservice.exception.DuplicatePrescriptionException;
import com.rhc.prescriptionservice.exception.InvalidStatusTransitionException;
import com.rhc.prescriptionservice.exception.ResourceNotFoundException;
import com.rhc.prescriptionservice.exception.UnauthorizedException;
import com.rhc.prescriptionservice.repository.PrescriptionRepository;
import com.rhc.notificationcontract.NotificationEvent;
import com.rhc.notificationcontract.NotificationEventPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PrescriptionService {

    @Autowired(required = false)
    private NotificationEventPublisher notificationEventPublisher;

    private final PrescriptionRepository prescriptionRepository;
    private final ConsultationClient consultationClient;
    private final MedicineScheduleClient medicineScheduleClient;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional
    public PrescriptionResponse createPrescription(Long doctorId, PrescriptionCreateRequest request) {
        if (prescriptionRepository.existsByConsultationId(request.getConsultationId())) {
            throw new DuplicatePrescriptionException("Prescription already exists for consultation ID: " + request.getConsultationId());
        }

        ConsultationResponse consultation = consultationClient.getConsultationById(request.getConsultationId());
        if (consultation == null) {
            throw new ResourceNotFoundException("Consultation not found with id " + request.getConsultationId());
        }

        if (!"COMPLETED".equals(consultation.getStatus())) {
            throw new InvalidStatusTransitionException("Cannot create prescription for consultation in status: " + consultation.getStatus());
        }

        if (!doctorId.equals(consultation.getDoctorId())) {
            throw new UnauthorizedException("Doctor ID does not match the consultation doctor ID");
        }

        Prescription prescription = Prescription.builder()
                .consultationId(request.getConsultationId())
                .patientId(consultation.getPatientId())
                .doctorId(doctorId)
                .status(PrescriptionStatus.DRAFT)
                .diagnosis(consultation.getDiagnosis())
                .generalInstructions(request.getGeneralInstructions())
                .build();

        request.getItems().forEach(itemDto -> {
            PrescriptionItem item = PrescriptionItem.builder()
                    .medicineName(itemDto.getMedicineName())
                    .dosageValue(itemDto.getDosageValue())
                    .dosageUnit(itemDto.getDosageUnit())
                    .frequency(itemDto.getFrequency())
                    .durationValue(itemDto.getDurationValue())
                    .durationUnit(itemDto.getDurationUnit())
                    .route(itemDto.getRoute())
                    .instructions(itemDto.getInstructions())
                    .build();
            prescription.addItem(item);
        });

        Prescription savedPrescription = prescriptionRepository.save(prescription);
        return mapToResponse(savedPrescription);
    }

    @Transactional(readOnly = true)
    public PrescriptionResponse getPrescriptionById(Long id, Long userId, boolean isDoctor) {
        Prescription prescription = prescriptionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Prescription not found with id " + id));

        validateAccess(prescription, userId, isDoctor);
        return mapToResponse(prescription);
    }

    @Transactional(readOnly = true)
    public List<PrescriptionSummaryResponse> getPrescriptionsByPatient(Long patientId) {
        return prescriptionRepository.findByPatientId(patientId).stream()
                .filter(prescription -> prescription.getStatus() == PrescriptionStatus.FINALIZED)
                .map(this::mapToSummaryResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<PrescriptionSummaryResponse> getPrescriptionsByDoctor(Long doctorId) {
        return prescriptionRepository.findByDoctorId(doctorId).stream()
                .map(this::mapToSummaryResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public PrescriptionResponse getPrescriptionByConsultation(Long consultationId, Long userId, boolean isDoctor) {
        Prescription prescription = prescriptionRepository.findByConsultationId(consultationId)
                .orElseThrow(() -> new ResourceNotFoundException("Prescription not found for consultation id " + consultationId));
        validateAccess(prescription, userId, isDoctor);
        return mapToResponse(prescription);
    }

    @Transactional
    public PrescriptionResponse finalizePrescription(Long id, Long doctorId) {
        Prescription prescription = prescriptionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Prescription not found with id " + id));

        if (!prescription.getDoctorId().equals(doctorId)) {
            throw new UnauthorizedException("Only the issuing doctor can finalize this prescription");
        }

        if (!prescription.getStatus().canTransitionTo(PrescriptionStatus.FINALIZED)) {
            throw new InvalidStatusTransitionException("Cannot transition prescription from " + prescription.getStatus() + " to " + PrescriptionStatus.FINALIZED);
        }

        prescription.setStatus(PrescriptionStatus.FINALIZED);
        prescription.setIssuedAt(LocalDateTime.now());
        Prescription savedPrescription = prescriptionRepository.save(prescription);
        eventPublisher.publishEvent(new PrescriptionFinalizedEvent(savedPrescription.getId()));
        if (notificationEventPublisher != null) {
            notificationEventPublisher.publish(NotificationEvent.now("NEW_PRESCRIPTION", savedPrescription.getPatientId(),
                    "New prescription", "Your doctor has finalized a prescription.",
                    java.util.Map.of("prescriptionId", savedPrescription.getId().toString())));
        }
        return mapToResponse(savedPrescription);
    }

    /**
     * The prescription transaction must commit before the medicine service reads it.
     * The event listener gives the second service a committed, durable prescription
     * while keeping the finalization request synchronous from the doctor's perspective.
     */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void generateMedicationSchedule(PrescriptionFinalizedEvent event) {
        try {
            medicineScheduleClient.createMedicationsFromPrescription(event.prescriptionId());
        } catch (RuntimeException ex) {
            log.error("Failed to generate medication schedule for finalized prescription {}",
                    event.prescriptionId(), ex);
        }
    }

    @Transactional
    public PrescriptionResponse cancelPrescription(Long id, Long userId) {
        Prescription prescription = prescriptionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Prescription not found with id " + id));

        if (!prescription.getDoctorId().equals(userId)) {
            throw new UnauthorizedException("Only the issuing doctor can cancel this prescription");
        }

        if (!prescription.getStatus().canTransitionTo(PrescriptionStatus.CANCELLED)) {
            throw new InvalidStatusTransitionException("Cannot transition prescription from " + prescription.getStatus() + " to " + PrescriptionStatus.CANCELLED);
        }

        prescription.setStatus(PrescriptionStatus.CANCELLED);
        Prescription savedPrescription = prescriptionRepository.save(prescription);
        return mapToResponse(savedPrescription);
    }

    @Transactional
    public PrescriptionResponse updateDraftPrescription(Long id, Long doctorId, PrescriptionCreateRequest request) {
        Prescription prescription = prescriptionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Prescription not found with id " + id));

        if (!prescription.getDoctorId().equals(doctorId)) {
            throw new UnauthorizedException("Only the issuing doctor can update this prescription");
        }

        if (prescription.getStatus() != PrescriptionStatus.DRAFT) {
            throw new InvalidStatusTransitionException("Only DRAFT prescriptions can be updated");
        }

        prescription.setGeneralInstructions(request.getGeneralInstructions());
        
        prescription.getItems().clear(); // orphanRemoval will delete old ones
        
        request.getItems().forEach(itemDto -> {
            PrescriptionItem item = PrescriptionItem.builder()
                    .medicineName(itemDto.getMedicineName())
                    .dosageValue(itemDto.getDosageValue())
                    .dosageUnit(itemDto.getDosageUnit())
                    .frequency(itemDto.getFrequency())
                    .durationValue(itemDto.getDurationValue())
                    .durationUnit(itemDto.getDurationUnit())
                    .route(itemDto.getRoute())
                    .instructions(itemDto.getInstructions())
                    .build();
            prescription.addItem(item);
        });

        Prescription savedPrescription = prescriptionRepository.save(prescription);
        return mapToResponse(savedPrescription);
    }

    private void validateAccess(Prescription prescription, Long userId, boolean isDoctor) {
        if (isDoctor && prescription.getDoctorId().equals(userId)) return;
        if (!isDoctor && prescription.getPatientId().equals(userId)) return;
        throw new UnauthorizedException("You do not have permission to view this prescription");
    }

    private PrescriptionResponse mapToResponse(Prescription prescription) {
        return PrescriptionResponse.builder()
                .id(prescription.getId())
                .consultationId(prescription.getConsultationId())
                .patientId(prescription.getPatientId())
                .doctorId(prescription.getDoctorId())
                .status(prescription.getStatus())
                .diagnosis(prescription.getDiagnosis())
                .generalInstructions(prescription.getGeneralInstructions())
                .issuedAt(prescription.getIssuedAt())
                .createdAt(prescription.getCreatedAt())
                .updatedAt(prescription.getUpdatedAt())
                .version(prescription.getVersion())
                .items(prescription.getItems().stream().map(this::mapItemToResponse).collect(Collectors.toList()))
                .build();
    }

    private PrescriptionItemResponse mapItemToResponse(PrescriptionItem item) {
        return PrescriptionItemResponse.builder()
                .id(item.getId())
                .prescriptionId(item.getPrescription() != null ? item.getPrescription().getId() : null)
                .medicineName(item.getMedicineName())
                .dosageValue(item.getDosageValue())
                .dosageUnit(item.getDosageUnit())
                .frequency(item.getFrequency())
                .durationValue(item.getDurationValue())
                .durationUnit(item.getDurationUnit())
                .route(item.getRoute())
                .instructions(item.getInstructions())
                .createdAt(item.getCreatedAt())
                .updatedAt(item.getUpdatedAt())
                .build();
    }

    private PrescriptionSummaryResponse mapToSummaryResponse(Prescription prescription) {
        return PrescriptionSummaryResponse.builder()
                .id(prescription.getId())
                .consultationId(prescription.getConsultationId())
                .patientId(prescription.getPatientId())
                .doctorId(prescription.getDoctorId())
                .status(prescription.getStatus())
                .diagnosis(prescription.getDiagnosis())
                .generalInstructions(prescription.getGeneralInstructions())
                .issuedAt(prescription.getIssuedAt())
                .createdAt(prescription.getCreatedAt())
                .itemCount(prescription.getItems().size())
                .build();
    }
}
