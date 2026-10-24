package com.rhc.appointmentservice.repository;

import com.rhc.appointmentservice.entity.DoctorSchedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public interface DoctorScheduleRepository extends JpaRepository<DoctorSchedule, Long> {

    List<DoctorSchedule> findByDoctorId(Long doctorId);

    List<DoctorSchedule> findByDoctorIdAndDayOfWeek(Long doctorId, DayOfWeek dayOfWeek);

    List<DoctorSchedule> findByDoctorIdAndSpecificDate(Long doctorId, LocalDate specificDate);

    @Query("SELECT s FROM DoctorSchedule s WHERE s.doctorId = :doctorId " +
           "AND s.isAvailable = true " +
           "AND (s.specificDate = :date OR (s.specificDate IS NULL AND s.dayOfWeek = :dayOfWeek)) " +
           "AND s.startTime <= :startTime AND s.endTime >= :endTime")
    List<DoctorSchedule> findMatchingSchedules(@Param("doctorId") Long doctorId,
                                                @Param("date") LocalDate date,
                                                @Param("dayOfWeek") DayOfWeek dayOfWeek,
                                                @Param("startTime") LocalTime startTime,
                                                @Param("endTime") LocalTime endTime);
}
