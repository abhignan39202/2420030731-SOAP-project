package com.rhc.medicineservice.repository;

import com.rhc.medicineservice.entity.MedicationReminder;
import com.rhc.medicineservice.entity.ReminderStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface MedicationReminderRepository extends JpaRepository<MedicationReminder, Long> {
    List<MedicationReminder> findByPatientIdAndScheduledAtBetweenOrderByScheduledAtAsc(Long patientId, LocalDateTime start, LocalDateTime end);
    List<MedicationReminder> findByPatientIdAndStatusOrderByScheduledAtAsc(Long patientId, ReminderStatus status);
    Page<MedicationReminder> findByPatientIdOrderByScheduledAtDesc(Long patientId, Pageable pageable);
    List<MedicationReminder> findByPatientIdOrderByScheduledAtDesc(Long patientId);
    boolean existsByMedicationIdAndScheduledAt(Long medicationId, LocalDateTime scheduledAt);
    List<MedicationReminder> findByMedicationIdOrderByScheduledAtAsc(Long medicationId);
    List<MedicationReminder> findByStatusAndScheduledAtBefore(ReminderStatus status, LocalDateTime cutoff);
}
