package com.rhc.appointmentservice.service;

import com.rhc.appointmentservice.client.DoctorClient;
import com.rhc.appointmentservice.dto.*;
import com.rhc.appointmentservice.entity.Appointment;
import com.rhc.appointmentservice.entity.AppointmentStatus;
import com.rhc.appointmentservice.entity.DoctorSchedule;
import com.rhc.appointmentservice.exception.*;
import com.rhc.appointmentservice.repository.AppointmentRepository;
import com.rhc.appointmentservice.repository.DoctorScheduleRepository;
import com.rhc.notificationcontract.NotificationEvent;
import com.rhc.notificationcontract.NotificationEventPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Arrays;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class AppointmentService {

    @Autowired(required = false)
    private NotificationEventPublisher notificationEventPublisher;

    private final AppointmentRepository appointmentRepository;
    private final DoctorScheduleRepository scheduleRepository;
    private final DoctorClient doctorClient;

    private static final List<AppointmentStatus> ACTIVE_STATUSES = List.of(
            AppointmentStatus.REQUESTED,
            AppointmentStatus.CONFIRMED
    );

    // ==========================================
    // DOCTOR AVAILABILITY MANAGEMENT
    // ==========================================

    @Transactional
    public AvailabilityResponse createAvailability(AvailabilityRequest request) {
        if (request.getStartTime().isAfter(request.getEndTime()) || request.getStartTime().equals(request.getEndTime())) {
            throw new IllegalArgumentException("Start time must be before end time");
        }

        if (request.getDayOfWeek() == null && request.getSpecificDate() == null) {
            throw new IllegalArgumentException("Either dayOfWeek or specificDate must be provided");
        }

        DoctorSchedule schedule = DoctorSchedule.builder()
                .doctorId(request.getDoctorId())
                .dayOfWeek(request.getDayOfWeek())
                .specificDate(request.getSpecificDate())
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .isAvailable(true)
                .build();

        DoctorSchedule saved = scheduleRepository.save(schedule);
        return mapToAvailabilityResponse(saved);
    }

    public List<AvailabilityResponse> getAvailabilityByDoctor(Long doctorId) {
        return scheduleRepository.findByDoctorId(doctorId).stream()
                .map(this::mapToAvailabilityResponse)
                .toList();
    }

    public List<AvailabilityResponse> getAvailabilityByDoctorAndDate(Long doctorId, LocalDate date) {
        DayOfWeek dayOfWeek = date.getDayOfWeek();
        List<Appointment> bookedAppointments = appointmentRepository.findByDoctorIdAndAppointmentDate(doctorId, date).stream()
                .filter(appointment -> ACTIVE_STATUSES.contains(appointment.getStatus()))
                .toList();
        return scheduleRepository.findByDoctorId(doctorId).stream()
                .filter(s -> s.isAvailable() &&
                        ((s.getSpecificDate() != null && s.getSpecificDate().equals(date)) ||
                         (s.getSpecificDate() == null && s.getDayOfWeek() == dayOfWeek)))
                .filter(schedule -> bookedAppointments.stream().noneMatch(appointment ->
                        schedule.getStartTime().isBefore(appointment.getEndTime()) &&
                        schedule.getEndTime().isAfter(appointment.getStartTime())))
                .map(this::mapToAvailabilityResponse)
                .toList();
    }

    public AvailabilityResponse getAvailabilityById(Long id) {
        DoctorSchedule schedule = scheduleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Schedule slot not found with id: " + id));
        return mapToAvailabilityResponse(schedule);
    }

    @Transactional
    public void deleteAvailability(Long id) {
        DoctorSchedule schedule = scheduleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Schedule slot not found with id: " + id));
        scheduleRepository.delete(schedule);
    }

    // ==========================================
    // APPOINTMENT BOOKING & MANAGEMENT
    // ==========================================

    @Transactional
    public AppointmentResponse bookAppointment(Long patientId, AppointmentRequest request) {
        validateAppointmentTiming(request.getAppointmentDate(), request.getStartTime(), request.getEndTime());

        // 1. Doctor Validation via Doctor Service (OpenFeign)
        validateDoctorEligibility(request.getDoctorId());

        // 2. Doctor Availability Validation
        validateDoctorAvailability(request.getDoctorId(), request.getAppointmentDate(), request.getStartTime(), request.getEndTime());

        // 3. Double-Booking Protection with Transactional & Pessimistic Lock
        List<Appointment> doctorConflicts = appointmentRepository.findConflictingDoctorAppointmentsWithLock(
                request.getDoctorId(),
                request.getAppointmentDate(),
                request.getStartTime(),
                request.getEndTime(),
                ACTIVE_STATUSES
        );

        if (!doctorConflicts.isEmpty()) {
            throw new AppointmentConflictException("Doctor is already booked for the requested time slot.");
        }

        // 4. Patient Overlap Protection
        List<Appointment> patientConflicts = appointmentRepository.findConflictingPatientAppointments(
                patientId,
                request.getAppointmentDate(),
                request.getStartTime(),
                request.getEndTime(),
                ACTIVE_STATUSES
        );

        if (!patientConflicts.isEmpty()) {
            throw new AppointmentConflictException("Patient already has a conflicting appointment at this time.");
        }

        Appointment appointment = Appointment.builder()
                .patientId(patientId)
                .doctorId(request.getDoctorId())
                .appointmentDate(request.getAppointmentDate())
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .status(AppointmentStatus.REQUESTED)
                .reason(request.getReason())
                .slotKey(request.getDoctorId() + "_" + request.getAppointmentDate() + "_" + request.getStartTime())
                .build();

        try {
            Appointment saved = appointmentRepository.saveAndFlush(appointment);
            return mapToAppointmentResponse(saved);
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            throw new AppointmentConflictException("Doctor is already booked for the requested time slot.");
        }
    }

    public AppointmentResponse getAppointmentById(Long id) {
        Appointment appointment = appointmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Appointment not found with id: " + id));
        return mapToAppointmentResponse(appointment);
    }

    public List<AppointmentResponse> getAppointmentsByPatient(Long patientId) {
        return appointmentRepository.findByPatientId(patientId).stream()
                .map(this::mapToAppointmentResponse)
                .toList();
    }

    public List<AppointmentResponse> getAppointmentsByDoctor(Long doctorId) {
        return appointmentRepository.findByDoctorId(doctorId).stream()
                .map(this::mapToAppointmentResponse)
                .toList();
    }

    public List<AppointmentResponse> getAppointmentsByDoctorAndDate(Long doctorId, LocalDate date) {
        return appointmentRepository.findByDoctorIdAndAppointmentDate(doctorId, date).stream()
                .map(this::mapToAppointmentResponse)
                .toList();
    }

    // ==========================================
    // APPOINTMENT STATUS TRANSITIONS
    // ==========================================

    @Transactional
    public AppointmentResponse confirmAppointment(Long id) {
        Appointment appointment = getAppointmentEntity(id);
        transitionStatus(appointment, AppointmentStatus.CONFIRMED);
        Appointment saved = appointmentRepository.save(appointment);
        if (notificationEventPublisher != null) {
            notificationEventPublisher.publish(NotificationEvent.now("APPOINTMENT_CONFIRMED", saved.getPatientId(),
                    "Appointment confirmed", "Your appointment has been confirmed.",
                    java.util.Map.of("appointmentId", saved.getId().toString())));
        }
        return mapToAppointmentResponse(saved);
    }

    @Transactional
    public AppointmentResponse cancelAppointment(Long id) {
        Appointment appointment = getAppointmentEntity(id);
        transitionStatus(appointment, AppointmentStatus.CANCELLED);
        appointment.setSlotKey(null);
        return mapToAppointmentResponse(appointmentRepository.saveAndFlush(appointment));
    }

    @Transactional
    public AppointmentResponse completeAppointment(Long id) {
        Appointment appointment = getAppointmentEntity(id);
        transitionStatus(appointment, AppointmentStatus.COMPLETED);
        return mapToAppointmentResponse(appointmentRepository.saveAndFlush(appointment));
    }

    @Transactional
    public AppointmentResponse markNoShow(Long id) {
        Appointment appointment = getAppointmentEntity(id);
        transitionStatus(appointment, AppointmentStatus.NO_SHOW);
        return mapToAppointmentResponse(appointmentRepository.saveAndFlush(appointment));
    }

    @Transactional
    public AppointmentResponse rescheduleAppointment(Long id, RescheduleRequest request) {
        Appointment appointment = getAppointmentEntity(id);

        if (appointment.getStatus() == AppointmentStatus.CANCELLED ||
            appointment.getStatus() == AppointmentStatus.COMPLETED ||
            appointment.getStatus() == AppointmentStatus.NO_SHOW) {
            throw new InvalidStatusTransitionException("Cannot reschedule a " + appointment.getStatus() + " appointment");
        }

        validateAppointmentTiming(request.getNewDate(), request.getNewStartTime(), request.getNewEndTime());
        validateDoctorAvailability(appointment.getDoctorId(), request.getNewDate(), request.getNewStartTime(), request.getNewEndTime());

        // Lock check doctor conflicts
        List<Appointment> doctorConflicts = appointmentRepository.findConflictingDoctorAppointmentsWithLock(
                appointment.getDoctorId(),
                request.getNewDate(),
                request.getNewStartTime(),
                request.getNewEndTime(),
                ACTIVE_STATUSES
        ).stream().filter(a -> !a.getId().equals(id)).toList();

        if (!doctorConflicts.isEmpty()) {
            throw new AppointmentConflictException("Doctor is already booked for the new time slot.");
        }

        // Check patient conflicts
        List<Appointment> patientConflicts = appointmentRepository.findConflictingPatientAppointmentsExcluding(
                appointment.getPatientId(),
                id,
                request.getNewDate(),
                request.getNewStartTime(),
                request.getNewEndTime(),
                ACTIVE_STATUSES
        );

        if (!patientConflicts.isEmpty()) {
            throw new AppointmentConflictException("Patient has another conflicting appointment at the new time.");
        }

        appointment.setAppointmentDate(request.getNewDate());
        appointment.setStartTime(request.getNewStartTime());
        appointment.setEndTime(request.getNewEndTime());
        if (request.getReason() != null && !request.getReason().isBlank()) {
            appointment.setReason(request.getReason());
        }
        appointment.setStatus(AppointmentStatus.REQUESTED);
        appointment.setSlotKey(appointment.getDoctorId() + "_" + request.getNewDate() + "_" + request.getNewStartTime());

        try {
            return mapToAppointmentResponse(appointmentRepository.saveAndFlush(appointment));
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            throw new AppointmentConflictException("Doctor is already booked for the new time slot.");
        }
    }

    // ==========================================
    // HELPER METHODS
    // ==========================================

    private Appointment getAppointmentEntity(Long id) {
        return appointmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Appointment not found with id: " + id));
    }

    private void transitionStatus(Appointment appointment, AppointmentStatus targetStatus) {
        if (!appointment.getStatus().canTransitionTo(targetStatus)) {
            throw new InvalidStatusTransitionException(
                    "Invalid status transition from " + appointment.getStatus() + " to " + targetStatus
            );
        }
        appointment.setStatus(targetStatus);
    }

    private void validateAppointmentTiming(LocalDate date, LocalTime startTime, LocalTime endTime) {
        if (date.isBefore(LocalDate.now())) {
            throw new IllegalArgumentException("Appointment date cannot be in the past");
        }
        if (date.equals(LocalDate.now()) && startTime.isBefore(LocalTime.now())) {
            throw new IllegalArgumentException("Appointment time cannot be in the past");
        }
        if (startTime.isAfter(endTime) || startTime.equals(endTime)) {
            throw new IllegalArgumentException("Start time must be strictly before end time");
        }
    }

    private void validateDoctorEligibility(Long doctorId) {
        try {
            DoctorProfileResponse doctor = doctorClient.getDoctorById(doctorId);
            if (doctor == null) {
                throw new DoctorValidationException("Doctor does not exist with ID: " + doctorId);
            }
            if (!"APPROVED".equalsIgnoreCase(doctor.getStatus())) {
                throw new DoctorValidationException("Doctor is not approved for appointments. Status: " + doctor.getStatus());
            }
        } catch (DoctorValidationException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Doctor Service unavailable or doctor not found: {}", e.getMessage());
            // Safe fallback / throw DoctorValidationException if feign call fails
            throw new DoctorValidationException("Unable to verify doctor eligibility: " + e.getMessage());
        }
    }

    private void validateDoctorAvailability(Long doctorId, LocalDate date, LocalTime startTime, LocalTime endTime) {
        DayOfWeek dayOfWeek = date.getDayOfWeek();
        List<DoctorSchedule> matching = scheduleRepository.findMatchingSchedules(doctorId, date, dayOfWeek, startTime, endTime);
        if (matching.isEmpty()) {
            throw new AppointmentConflictException("Requested slot is outside the doctor's defined availability.");
        }
    }

    private AvailabilityResponse mapToAvailabilityResponse(DoctorSchedule schedule) {
        return AvailabilityResponse.builder()
                .id(schedule.getId())
                .doctorId(schedule.getDoctorId())
                .dayOfWeek(schedule.getDayOfWeek())
                .specificDate(schedule.getSpecificDate())
                .startTime(schedule.getStartTime())
                .endTime(schedule.getEndTime())
                .isAvailable(schedule.isAvailable())
                .build();
    }

    private AppointmentResponse mapToAppointmentResponse(Appointment appointment) {
        return AppointmentResponse.builder()
                .id(appointment.getId())
                .patientId(appointment.getPatientId())
                .doctorId(appointment.getDoctorId())
                .appointmentDate(appointment.getAppointmentDate())
                .startTime(appointment.getStartTime())
                .endTime(appointment.getEndTime())
                .status(appointment.getStatus())
                .reason(appointment.getReason())
                .createdAt(appointment.getCreatedAt())
                .updatedAt(appointment.getUpdatedAt())
                .build();
    }
}
