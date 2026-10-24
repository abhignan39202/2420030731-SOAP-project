package com.rhc.appointmentservice.repository;

import com.rhc.appointmentservice.entity.Appointment;
import com.rhc.appointmentservice.entity.AppointmentStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public interface AppointmentRepository extends JpaRepository<Appointment, Long> {

    List<Appointment> findByPatientId(Long patientId);

    List<Appointment> findByDoctorId(Long doctorId);

    List<Appointment> findByDoctorIdAndAppointmentDate(Long doctorId, LocalDate appointmentDate);

    List<Appointment> findByPatientIdAndAppointmentDate(Long patientId, LocalDate appointmentDate);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT a FROM Appointment a WHERE a.doctorId = :doctorId " +
           "AND a.appointmentDate = :date " +
           "AND a.status IN :activeStatuses " +
           "AND (:startTime < a.endTime AND :endTime > a.startTime)")
    List<Appointment> findConflictingDoctorAppointmentsWithLock(@Param("doctorId") Long doctorId,
                                                                 @Param("date") LocalDate date,
                                                                 @Param("startTime") LocalTime startTime,
                                                                 @Param("endTime") LocalTime endTime,
                                                                 @Param("activeStatuses") List<AppointmentStatus> activeStatuses);

    @Query("SELECT a FROM Appointment a WHERE a.patientId = :patientId " +
           "AND a.appointmentDate = :date " +
           "AND a.status IN :activeStatuses " +
           "AND (:startTime < a.endTime AND :endTime > a.startTime)")
    List<Appointment> findConflictingPatientAppointments(@Param("patientId") Long patientId,
                                                         @Param("date") LocalDate date,
                                                         @Param("startTime") LocalTime startTime,
                                                         @Param("endTime") LocalTime endTime,
                                                         @Param("activeStatuses") List<AppointmentStatus> activeStatuses);

    @Query("SELECT a FROM Appointment a WHERE a.patientId = :patientId " +
           "AND a.id != :excludeAppointmentId " +
           "AND a.appointmentDate = :date " +
           "AND a.status IN :activeStatuses " +
           "AND (:startTime < a.endTime AND :endTime > a.startTime)")
    List<Appointment> findConflictingPatientAppointmentsExcluding(@Param("patientId") Long patientId,
                                                                   @Param("excludeAppointmentId") Long excludeAppointmentId,
                                                                   @Param("date") LocalDate date,
                                                                   @Param("startTime") LocalTime startTime,
                                                                   @Param("endTime") LocalTime endTime,
                                                                   @Param("activeStatuses") List<AppointmentStatus> activeStatuses);
}
