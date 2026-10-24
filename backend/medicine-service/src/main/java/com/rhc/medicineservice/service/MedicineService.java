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
import com.rhc.notificationcontract.NotificationEvent;
import com.rhc.notificationcontract.NotificationEventPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class MedicineService {

    @Autowired(required = false)
    private NotificationEventPublisher notificationEventPublisher;

    private final MedicineRepository medicineRepository;
    private final MedicationRepository medicationRepository;
    private final MedicationReminderRepository reminderRepository;
    private final PrescriptionClient prescriptionClient;

    @Value("${reminder.grace-minutes:60}")
    private long graceMinutes;

    public List<MedicineDTO> getAllMedicines() {
        return medicineRepository.findByActiveTrue().stream()
                .map(this::mapToMedicineDTO)
                .collect(Collectors.toList());
    }

    public MedicineDTO getMedicineById(Long id) {
        Medicine medicine = medicineRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Medicine not found"));
        return mapToMedicineDTO(medicine);
    }

    @Transactional
    public List<MedicationResponse> createMedicationsFromPrescription(Long prescriptionId, Long requestingDoctorId) {
        PrescriptionResponse prescription = prescriptionClient.getPrescriptionById(prescriptionId);
        
        if (!"FINALIZED".equals(prescription.getStatus())) {
            throw new InvalidStatusTransitionException("Prescription is not finalized");
        }
        if (requestingDoctorId == null || !requestingDoctorId.equals(prescription.getDoctorId())) {
            throw new UnauthorizedException("Only the issuing doctor can generate this medication schedule");
        }

        List<MedicationResponse> responses = new ArrayList<>();
        LocalDate today = LocalDate.now();

        for (PrescriptionItemResponse item : prescription.getItems()) {
            if (medicationRepository.existsByPrescriptionItemId(item.getId())) {
                continue; // Idempotent
            }

            DurationUnit unit = DurationUnit.valueOf(item.getDurationUnit().toUpperCase());
            LocalDate endDate = today;
            switch (unit) {
                case DAYS -> endDate = today.plusDays(item.getDurationValue() - 1);
                case WEEKS -> endDate = today.plusWeeks(item.getDurationValue()).minusDays(1);
                case MONTHS -> endDate = today.plusMonths(item.getDurationValue()).minusDays(1);
            }

            Medication medication = Medication.builder()
                    .patientId(prescription.getPatientId())
                    .prescriptionId(prescription.getId())
                    .prescriptionItemId(item.getId())
                    .medicineName(item.getMedicineName())
                    .dosageValue(item.getDosageValue())
                    .dosageUnit(item.getDosageUnit())
                    .frequency(Frequency.valueOf(item.getFrequency().toUpperCase()))
                    .durationValue(item.getDurationValue())
                    .durationUnit(unit)
                    .startDate(today)
                    .endDate(endDate)
                    .instructions(item.getInstructions())
                    .status(MedicationStatus.ACTIVE)
                    .build();

            medication = medicationRepository.save(medication);
            generateRemindersForMedication(medication);
            
            responses.add(mapToMedicationResponse(medication));
        }

        return responses;
    }

    private void generateRemindersForMedication(Medication medication) {
        if (medication.getFrequency() == Frequency.AS_NEEDED) {
            return; 
        }

        List<LocalTime> times = getTimesForFrequency(medication.getFrequency());
        if (times.isEmpty()) return;

        LocalDate currentDate = medication.getStartDate();
        LocalDate endDate = medication.getEndDate();

        List<MedicationReminder> newReminders = new ArrayList<>();
        while (!currentDate.isAfter(endDate)) {
            for (LocalTime time : times) {
                LocalDateTime scheduledAt = currentDate.atTime(time);
                if (!reminderRepository.existsByMedicationIdAndScheduledAt(medication.getId(), scheduledAt)) {
                    MedicationReminder reminder = MedicationReminder.builder()
                            .medication(medication)
                            .medicineId(medication.getId())
                            .patientId(medication.getPatientId())
                            .prescriptionId(medication.getPrescriptionId())
                            .scheduledAt(scheduledAt)
                            .status(ReminderStatus.PENDING)
                            .build();
                    newReminders.add(reminder);
                }
            }
            currentDate = currentDate.plusDays(1);
        }
        
        if (!newReminders.isEmpty()) {
            List<MedicationReminder> savedReminders = reminderRepository.saveAll(newReminders);
            if (notificationEventPublisher != null) {
                savedReminders.forEach(reminder -> notificationEventPublisher.publish(NotificationEvent.scheduled(
                        "MEDICATION_REMINDER:" + reminder.getId(), "MEDICATION_REMINDER", reminder.getPatientId(),
                        "Medication reminder", "You have a scheduled medication reminder.",
                        java.util.Map.of("reminderId", reminder.getId().toString(),
                                "prescriptionId", reminder.getPrescriptionId().toString()),
                        reminder.getScheduledAt())));
            }
        }
    }

    private List<LocalTime> getTimesForFrequency(Frequency frequency) {
        return switch (frequency) {
            case ONCE_DAILY -> List.of(LocalTime.of(8, 0));
            case TWICE_DAILY -> List.of(LocalTime.of(8, 0), LocalTime.of(20, 0));
            case THREE_TIMES_DAILY -> List.of(LocalTime.of(8, 0), LocalTime.of(14, 0), LocalTime.of(20, 0));
            case FOUR_TIMES_DAILY -> List.of(LocalTime.of(8, 0), LocalTime.of(12, 0), LocalTime.of(16, 0), LocalTime.of(20, 0));
            case EVERY_SIX_HOURS -> List.of(LocalTime.of(6, 0), LocalTime.of(12, 0), LocalTime.of(18, 0), LocalTime.of(0, 0));
            case EVERY_EIGHT_HOURS -> List.of(LocalTime.of(8, 0), LocalTime.of(16, 0), LocalTime.of(0, 0));
            case EVERY_TWELVE_HOURS -> List.of(LocalTime.of(8, 0), LocalTime.of(20, 0));
            case BEFORE_MEALS -> List.of(LocalTime.of(7, 30), LocalTime.of(12, 30), LocalTime.of(19, 30));
            case AFTER_MEALS -> List.of(LocalTime.of(8, 30), LocalTime.of(13, 30), LocalTime.of(20, 30));
            case AS_NEEDED -> List.of();
        };
    }

    public List<MedicationReminderResponse> getTodayReminders(Long patientId) {
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        LocalDateTime endOfDay = LocalDate.now().atTime(23, 59, 59);
        return reminderRepository.findByPatientIdAndScheduledAtBetweenOrderByScheduledAtAsc(patientId, startOfDay, endOfDay)
                .stream().map(this::mapToReminderResponse).collect(Collectors.toList());
    }

    public List<MedicationReminderResponse> getUpcomingReminders(Long patientId) {
        return reminderRepository.findByPatientIdAndStatusOrderByScheduledAtAsc(patientId, ReminderStatus.PENDING)
                .stream()
                .filter(r -> r.getScheduledAt().isAfter(LocalDateTime.now()))
                .map(this::mapToReminderResponse).collect(Collectors.toList());
    }

    public List<MedicationResponse> getPatientMedications(Long patientId) {
        return medicationRepository.findByPatientId(patientId).stream()
                .map(this::mapToMedicationResponse).collect(Collectors.toList());
    }

    public MedicationResponse getMedicationById(Long medicationId, Long patientId) {
        Medication medication = medicationRepository.findById(medicationId)
                .orElseThrow(() -> new ResourceNotFoundException("Medication not found"));
        if (!medication.getPatientId().equals(patientId)) {
            throw new UnauthorizedException("Not authorized");
        }
        return mapToMedicationResponse(medication);
    }

    @Transactional
    public void markReminderTaken(Long reminderId, Long patientId) {
        MedicationReminder reminder = reminderRepository.findById(reminderId)
                .orElseThrow(() -> new ResourceNotFoundException("Reminder not found"));
        if (!reminder.getPatientId().equals(patientId)) {
            throw new UnauthorizedException("Not authorized");
        }
        if (reminder.getStatus() != ReminderStatus.PENDING) {
            throw new InvalidStatusTransitionException("Reminder is not PENDING");
        }
        reminder.setStatus(ReminderStatus.TAKEN);
        LocalDateTime takenAt = LocalDateTime.now();
        reminder.setTakenAt(takenAt);
        reminder.setAcknowledgedAt(takenAt);
        reminderRepository.save(reminder);
    }

    @Transactional
    public void markReminderSkipped(Long reminderId, Long patientId) {
        MedicationReminder reminder = reminderRepository.findById(reminderId)
                .orElseThrow(() -> new ResourceNotFoundException("Reminder not found"));
        if (!reminder.getPatientId().equals(patientId)) {
            throw new UnauthorizedException("Not authorized");
        }
        if (reminder.getStatus() != ReminderStatus.PENDING) {
            throw new InvalidStatusTransitionException("Reminder is not PENDING");
        }
        reminder.setStatus(ReminderStatus.SKIPPED);
        reminder.setAcknowledgedAt(LocalDateTime.now());
        reminderRepository.save(reminder);
    }

    public List<MedicationReminderResponse> getPatientHistory(Long patientId, int page, int size) {
        return reminderRepository.findByPatientIdOrderByScheduledAtDesc(patientId, PageRequest.of(page, size))
                .stream().map(this::mapToReminderResponse).collect(Collectors.toList());
    }

    public List<MedicationReminderResponse> getPatientReminders(Long patientId) {
        return reminderRepository.findByPatientIdOrderByScheduledAtDesc(patientId, PageRequest.of(0, 100))
                .stream().map(this::mapToReminderResponse).collect(Collectors.toList());
    }

    public AdherenceSummaryResponse getAdherenceSummary(Long patientId) {
        List<MedicationReminder> reminders = reminderRepository.findByPatientIdOrderByScheduledAtDesc(patientId);
        
        long taken = 0, missed = 0, pending = 0, skipped = 0;
        
        for (MedicationReminder r : reminders) {
            switch (r.getStatus()) {
                case TAKEN -> taken++;
                case MISSED -> missed++;
                case PENDING -> pending++;
                case SKIPPED -> skipped++;
            }
        }
        
        long eligible = taken + missed;
        double percentage = eligible == 0 ? 100.0 : ((double) taken / eligible) * 100.0;
        
        return AdherenceSummaryResponse.builder()
                .totalEligible(eligible)
                .takenCount(taken)
                .missedCount(missed)
                .pendingCount(pending)
                .skippedCount(skipped)
                .adherencePercentage(percentage)
                .build();
    }

    @Scheduled(cron = "0 */15 * * * *")
    @Transactional
    public void updateMissedReminders() {
        LocalDateTime cutoff = LocalDateTime.now().minusMinutes(graceMinutes);
        List<MedicationReminder> missed = reminderRepository.findByStatusAndScheduledAtBefore(ReminderStatus.PENDING, cutoff);
        for (MedicationReminder r : missed) {
            r.setStatus(ReminderStatus.MISSED);
        }
        if (!missed.isEmpty()) {
            reminderRepository.saveAll(missed);
            log.info("Updated {} reminders to MISSED status", missed.size());
        }
    }

    @Scheduled(cron = "0 0 0 * * *")
    @Transactional
    public void expireMedications() {
        LocalDate today = LocalDate.now();
        List<Medication> expired = medicationRepository.findByStatusAndEndDateBefore(MedicationStatus.ACTIVE, today);
        for (Medication m : expired) {
            m.setStatus(MedicationStatus.COMPLETED);
        }
        if (!expired.isEmpty()) {
            medicationRepository.saveAll(expired);
            log.info("Updated {} medications to COMPLETED status", expired.size());
        }
    }

    private MedicineDTO mapToMedicineDTO(Medicine m) {
        return MedicineDTO.builder()
                .id(m.getId())
                .name(m.getName())
                .genericName(m.getGenericName())
                .dosageForm(m.getDosageForm())
                .strength(m.getStrength())
                .description(m.getDescription())
                .active(m.isActive())
                .build();
    }

    private MedicationResponse mapToMedicationResponse(Medication m) {
        return MedicationResponse.builder()
                .id(m.getId())
                .patientId(m.getPatientId())
                .prescriptionId(m.getPrescriptionId())
                .prescriptionItemId(m.getPrescriptionItemId())
                .medicineName(m.getMedicineName())
                .dosageValue(m.getDosageValue())
                .dosageUnit(m.getDosageUnit())
                .frequency(m.getFrequency())
                .durationValue(m.getDurationValue())
                .durationUnit(m.getDurationUnit())
                .startDate(m.getStartDate())
                .endDate(m.getEndDate())
                .instructions(m.getInstructions())
                .status(m.getStatus())
                .createdAt(m.getCreatedAt())
                .build();
    }

    private MedicationReminderResponse mapToReminderResponse(MedicationReminder r) {
        String dosage = r.getMedication().getDosageValue() + " " + r.getMedication().getDosageUnit();
        return MedicationReminderResponse.builder()
                .id(r.getId())
                .medicationId(r.getMedication().getId())
                .medicineId(r.getMedicineId() != null ? r.getMedicineId() : r.getMedication().getId())
                .patientId(r.getPatientId())
                .prescriptionId(r.getPrescriptionId() != null ? r.getPrescriptionId() : r.getMedication().getPrescriptionId())
                .medicineName(r.getMedication().getMedicineName())
                .dosage(dosage)
                .frequency(r.getMedication().getFrequency())
                .scheduledAt(r.getScheduledAt())
                .scheduledTime(r.getScheduledAt())
                .status(r.getStatus())
                .takenAt(r.getTakenAt())
                .acknowledgedAt(r.getAcknowledgedAt())
                .instructions(r.getMedication().getInstructions())
                .build();
    }
}
