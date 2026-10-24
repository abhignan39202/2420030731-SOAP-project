package com.rhc.appointmentservice;

import com.rhc.appointmentservice.client.DoctorClient;
import com.rhc.appointmentservice.dto.*;
import com.rhc.appointmentservice.entity.Appointment;
import com.rhc.appointmentservice.entity.AppointmentStatus;
import com.rhc.appointmentservice.entity.DoctorSchedule;
import com.rhc.appointmentservice.exception.*;
import com.rhc.appointmentservice.repository.AppointmentRepository;
import com.rhc.appointmentservice.repository.DoctorScheduleRepository;
import com.rhc.appointmentservice.service.AppointmentService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AppointmentServiceTest {

    @Mock
    private AppointmentRepository appointmentRepository;

    @Mock
    private DoctorScheduleRepository scheduleRepository;

    @Mock
    private DoctorClient doctorClient;

    @InjectMocks
    private AppointmentService appointmentService;

    private Long doctorId;
    private Long patientId;
    private LocalDate futureDate;
    private LocalTime startTime;
    private LocalTime endTime;

    @BeforeEach
    void setUp() {
        doctorId = 1L;
        patientId = 100L;
        futureDate = LocalDate.now().plusDays(5);
        startTime = LocalTime.of(10, 0);
        endTime = LocalTime.of(10, 30);

        lenient().when(appointmentRepository.save(any())).thenAnswer(i -> i.getArgument(0));
        lenient().when(appointmentRepository.saveAndFlush(any())).thenAnswer(i -> i.getArgument(0));
    }

    @Test
    void testCreateAndRetrieveAvailability() {
        AvailabilityRequest req = AvailabilityRequest.builder()
                .doctorId(doctorId)
                .dayOfWeek(futureDate.getDayOfWeek())
                .startTime(startTime)
                .endTime(endTime)
                .build();

        DoctorSchedule schedule = DoctorSchedule.builder()
                .id(10L)
                .doctorId(doctorId)
                .dayOfWeek(futureDate.getDayOfWeek())
                .startTime(startTime)
                .endTime(endTime)
                .isAvailable(true)
                .build();

        when(scheduleRepository.save(any(DoctorSchedule.class))).thenReturn(schedule);
        when(scheduleRepository.findByDoctorId(doctorId)).thenReturn(List.of(schedule));

        AvailabilityResponse resp = appointmentService.createAvailability(req);
        assertNotNull(resp);
        assertEquals(doctorId, resp.getDoctorId());

        List<AvailabilityResponse> list = appointmentService.getAvailabilityByDoctor(doctorId);
        assertEquals(1, list.size());
    }

    @Test
    void bookedScheduleIsNotReturnedAsAvailableForDate() {
        DoctorSchedule schedule = DoctorSchedule.builder()
                .id(11L)
                .doctorId(doctorId)
                .dayOfWeek(futureDate.getDayOfWeek())
                .startTime(startTime)
                .endTime(endTime)
                .isAvailable(true)
                .build();
        Appointment booked = Appointment.builder()
                .id(51L)
                .doctorId(doctorId)
                .appointmentDate(futureDate)
                .startTime(startTime)
                .endTime(endTime)
                .status(AppointmentStatus.CONFIRMED)
                .build();

        when(scheduleRepository.findByDoctorId(doctorId)).thenReturn(List.of(schedule));
        when(appointmentRepository.findByDoctorIdAndAppointmentDate(doctorId, futureDate)).thenReturn(List.of(booked));

        assertTrue(appointmentService.getAvailabilityByDoctorAndDate(doctorId, futureDate).isEmpty());
    }

    @Test
    void testBookAppointment_Success() {
        AppointmentRequest req = AppointmentRequest.builder()
                .doctorId(doctorId)
                .appointmentDate(futureDate)
                .startTime(startTime)
                .endTime(endTime)
                .reason("Regular Checkup")
                .build();

        DoctorProfileResponse doctorResp = DoctorProfileResponse.builder()
                .userId(doctorId)
                .status("APPROVED")
                .isAvailable(true)
                .build();

        DoctorSchedule schedule = DoctorSchedule.builder()
                .doctorId(doctorId)
                .dayOfWeek(futureDate.getDayOfWeek())
                .startTime(startTime)
                .endTime(endTime)
                .isAvailable(true)
                .build();

        Appointment savedAppointment = Appointment.builder()
                .id(50L)
                .patientId(patientId)
                .doctorId(doctorId)
                .appointmentDate(futureDate)
                .startTime(startTime)
                .endTime(endTime)
                .status(AppointmentStatus.REQUESTED)
                .reason("Regular Checkup")
                .build();

        when(doctorClient.getDoctorById(doctorId)).thenReturn(doctorResp);
        when(scheduleRepository.findMatchingSchedules(eq(doctorId), eq(futureDate), eq(futureDate.getDayOfWeek()), eq(startTime), eq(endTime)))
                .thenReturn(List.of(schedule));
        when(appointmentRepository.findConflictingDoctorAppointmentsWithLock(eq(doctorId), eq(futureDate), eq(startTime), eq(endTime), anyList()))
                .thenReturn(Collections.emptyList());
        when(appointmentRepository.findConflictingPatientAppointments(eq(patientId), eq(futureDate), eq(startTime), eq(endTime), anyList()))
                .thenReturn(Collections.emptyList());
        when(appointmentRepository.saveAndFlush(any())).thenReturn(savedAppointment);

        AppointmentResponse result = appointmentService.bookAppointment(patientId, req);
        assertNotNull(result);
        assertEquals(AppointmentStatus.REQUESTED, result.getStatus());
        assertEquals(50L, result.getId());
    }

    @Test
    void testBookAppointment_RejectUnapprovedDoctor() {
        AppointmentRequest req = AppointmentRequest.builder()
                .doctorId(doctorId)
                .appointmentDate(futureDate)
                .startTime(startTime)
                .endTime(endTime)
                .build();

        DoctorProfileResponse doctorResp = DoctorProfileResponse.builder()
                .userId(doctorId)
                .status("PENDING_VERIFICATION")
                .build();

        when(doctorClient.getDoctorById(doctorId)).thenReturn(doctorResp);

        assertThrows(DoctorValidationException.class, () ->
                appointmentService.bookAppointment(patientId, req)
        );
    }

    @Test
    void testBookAppointment_RejectOutsideAvailability() {
        AppointmentRequest req = AppointmentRequest.builder()
                .doctorId(doctorId)
                .appointmentDate(futureDate)
                .startTime(startTime)
                .endTime(endTime)
                .build();

        DoctorProfileResponse doctorResp = DoctorProfileResponse.builder()
                .userId(doctorId)
                .status("APPROVED")
                .build();

        when(doctorClient.getDoctorById(doctorId)).thenReturn(doctorResp);
        when(scheduleRepository.findMatchingSchedules(eq(doctorId), eq(futureDate), eq(futureDate.getDayOfWeek()), eq(startTime), eq(endTime)))
                .thenReturn(Collections.emptyList());

        assertThrows(AppointmentConflictException.class, () ->
                appointmentService.bookAppointment(patientId, req)
        );
    }

    @Test
    void testBookAppointment_RejectPastDate() {
        AppointmentRequest req = AppointmentRequest.builder()
                .doctorId(doctorId)
                .appointmentDate(LocalDate.now().minusDays(1))
                .startTime(startTime)
                .endTime(endTime)
                .build();

        assertThrows(IllegalArgumentException.class, () ->
                appointmentService.bookAppointment(patientId, req)
        );
    }

    @Test
    void testBookAppointment_RejectDoctorConflict() {
        AppointmentRequest req = AppointmentRequest.builder()
                .doctorId(doctorId)
                .appointmentDate(futureDate)
                .startTime(startTime)
                .endTime(endTime)
                .build();

        DoctorProfileResponse doctorResp = DoctorProfileResponse.builder()
                .userId(doctorId)
                .status("APPROVED")
                .build();

        DoctorSchedule schedule = DoctorSchedule.builder().doctorId(doctorId).build();
        Appointment existing = Appointment.builder().id(99L).build();

        when(doctorClient.getDoctorById(doctorId)).thenReturn(doctorResp);
        when(scheduleRepository.findMatchingSchedules(any(), any(), any(), any(), any()))
                .thenReturn(List.of(schedule));
        when(appointmentRepository.findConflictingDoctorAppointmentsWithLock(any(), any(), any(), any(), anyList()))
                .thenReturn(List.of(existing));

        assertThrows(AppointmentConflictException.class, () ->
                appointmentService.bookAppointment(patientId, req)
        );
    }

    @Test
    void testBookAppointment_RejectPatientConflict() {
        AppointmentRequest req = AppointmentRequest.builder()
                .doctorId(doctorId)
                .appointmentDate(futureDate)
                .startTime(startTime)
                .endTime(endTime)
                .build();

        DoctorProfileResponse doctorResp = DoctorProfileResponse.builder()
                .userId(doctorId)
                .status("APPROVED")
                .build();

        DoctorSchedule schedule = DoctorSchedule.builder().doctorId(doctorId).build();
        Appointment existingPatientAppt = Appointment.builder().id(88L).build();

        when(doctorClient.getDoctorById(doctorId)).thenReturn(doctorResp);
        when(scheduleRepository.findMatchingSchedules(any(), any(), any(), any(), any()))
                .thenReturn(List.of(schedule));
        when(appointmentRepository.findConflictingDoctorAppointmentsWithLock(any(), any(), any(), any(), anyList()))
                .thenReturn(Collections.emptyList());
        when(appointmentRepository.findConflictingPatientAppointments(any(), any(), any(), any(), anyList()))
                .thenReturn(List.of(existingPatientAppt));

        assertThrows(AppointmentConflictException.class, () ->
                appointmentService.bookAppointment(patientId, req)
        );
    }

    @Test
    void testStatusTransitions() {
        Appointment appt = Appointment.builder()
                .id(1L)
                .status(AppointmentStatus.REQUESTED)
                .build();

        when(appointmentRepository.findById(1L)).thenReturn(Optional.of(appt));

        // REQUESTED -> CONFIRMED
        AppointmentResponse confirmed = appointmentService.confirmAppointment(1L);
        assertEquals(AppointmentStatus.CONFIRMED, confirmed.getStatus());

        // CONFIRMED -> COMPLETED
        AppointmentResponse completed = appointmentService.completeAppointment(1L);
        assertEquals(AppointmentStatus.COMPLETED, completed.getStatus());

        // COMPLETED -> CANCELLED should throw Exception
        assertThrows(InvalidStatusTransitionException.class, () ->
                appointmentService.cancelAppointment(1L)
        );
    }

    @Test
    void testCancelAndNoShowTransitions() {
        Appointment appt1 = Appointment.builder().id(1L).status(AppointmentStatus.REQUESTED).build();
        when(appointmentRepository.findById(1L)).thenReturn(Optional.of(appt1));

        AppointmentResponse cancelled = appointmentService.cancelAppointment(1L);
        assertEquals(AppointmentStatus.CANCELLED, cancelled.getStatus());

        Appointment appt2 = Appointment.builder().id(2L).status(AppointmentStatus.CONFIRMED).build();
        when(appointmentRepository.findById(2L)).thenReturn(Optional.of(appt2));

        AppointmentResponse noShow = appointmentService.markNoShow(2L);
        assertEquals(AppointmentStatus.NO_SHOW, noShow.getStatus());
    }
}
