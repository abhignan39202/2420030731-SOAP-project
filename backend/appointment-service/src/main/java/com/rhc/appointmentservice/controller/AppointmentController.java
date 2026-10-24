package com.rhc.appointmentservice.controller;

import com.rhc.appointmentservice.dto.AppointmentRequest;
import com.rhc.appointmentservice.dto.AppointmentResponse;
import com.rhc.appointmentservice.dto.RescheduleRequest;
import com.rhc.appointmentservice.service.AppointmentService;
import com.rhc.appointmentservice.exception.UnauthorizedException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/appointments")
@RequiredArgsConstructor
public class AppointmentController {

    private final AppointmentService appointmentService;

    @PostMapping
    public ResponseEntity<AppointmentResponse> bookAppointment(
            HttpServletRequest servletRequest,
            @Valid @RequestBody AppointmentRequest appointmentRequest) {

        Long patientId = resolveUserId(servletRequest);
        if (!hasRole(servletRequest, "PATIENT", userRoles(servletRequest))) {
            throw new UnauthorizedException("Only patients can book appointments.");
        }

        AppointmentResponse response = appointmentService.bookAppointment(patientId, appointmentRequest);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<AppointmentResponse> getAppointmentById(
            HttpServletRequest request,
            @PathVariable Long id) {
        AppointmentResponse appointment = appointmentService.getAppointmentById(id);
        assertAppointmentAccess(request, appointment);
        return ResponseEntity.ok(appointment);
    }

    @GetMapping("/patient/{patientId}")
    public ResponseEntity<List<AppointmentResponse>> getAppointmentsByPatient(HttpServletRequest request, @PathVariable Long patientId) {
        assertIdentity(request, patientId, "patient", "PATIENT");
        return ResponseEntity.ok(appointmentService.getAppointmentsByPatient(patientId));
    }

    @GetMapping("/doctor/{doctorId}")
    public ResponseEntity<List<AppointmentResponse>> getAppointmentsByDoctor(
            HttpServletRequest request,
            @PathVariable Long doctorId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        assertIdentity(request, doctorId, "doctor", "DOCTOR");
        if (date != null) {
            return ResponseEntity.ok(appointmentService.getAppointmentsByDoctorAndDate(doctorId, date));
        }
        return ResponseEntity.ok(appointmentService.getAppointmentsByDoctor(doctorId));
    }

    @PatchMapping("/{id}/confirm")
    public ResponseEntity<AppointmentResponse> confirmAppointment(HttpServletRequest request, @PathVariable Long id) {
        assertDoctorOwnsAppointment(request, id);
        return ResponseEntity.ok(appointmentService.confirmAppointment(id));
    }

    @PatchMapping("/{id}/cancel")
    public ResponseEntity<AppointmentResponse> cancelAppointment(HttpServletRequest request, @PathVariable Long id) {
        assertAppointmentAccess(request, appointmentService.getAppointmentById(id));
        return ResponseEntity.ok(appointmentService.cancelAppointment(id));
    }

    @PatchMapping("/{id}/complete")
    public ResponseEntity<AppointmentResponse> completeAppointment(HttpServletRequest request, @PathVariable Long id) {
        assertDoctorOwnsAppointment(request, id);
        return ResponseEntity.ok(appointmentService.completeAppointment(id));
    }

    @PatchMapping("/{id}/no-show")
    public ResponseEntity<AppointmentResponse> markNoShow(HttpServletRequest request, @PathVariable Long id) {
        assertDoctorOwnsAppointment(request, id);
        return ResponseEntity.ok(appointmentService.markNoShow(id));
    }

    @PatchMapping("/{id}/reschedule")
    public ResponseEntity<AppointmentResponse> rescheduleAppointment(
            HttpServletRequest servletRequest,
            @PathVariable Long id,
            @Valid @RequestBody RescheduleRequest rescheduleRequest) {
        assertAppointmentAccess(servletRequest, appointmentService.getAppointmentById(id));
        return ResponseEntity.ok(appointmentService.rescheduleAppointment(id, rescheduleRequest));
    }

    private Long resolveUserId(HttpServletRequest request) {
        Object authenticated = request.getAttribute("userId");
        if (authenticated instanceof Number number) return number.longValue();
        if (authenticated instanceof String value && !value.isBlank()) return Long.valueOf(value);
        if (request.getAttribute("username") != null) {
            throw new UnauthorizedException("Authenticated token does not contain a user ID.");
        }
        throw new UnauthorizedException("Authenticated token must contain a user ID.");
    }

    private String userRoles(HttpServletRequest request) {
        Object roles = request.getAttribute("roles");
        return roles == null ? "" : roles.toString();
    }

    private boolean hasRole(HttpServletRequest request, String expected, String roles) {
        if (roles == null) return false;
        return java.util.Arrays.stream(roles.split("[,\\s\\[\\]]+"))
                .map(role -> role.startsWith("ROLE_") ? role.substring(5) : role)
                .anyMatch(expected::equals);
    }

    private void assertIdentity(HttpServletRequest request, Long expectedId, String resource, String requiredRole) {
        Long currentId = resolveUserId(request);
        if (!expectedId.equals(currentId) || !hasRole(request, requiredRole, userRoles(request))) {
            throw new UnauthorizedException("User is not authorized to access this " + resource + " appointment list.");
        }
    }

    private void assertAppointmentAccess(HttpServletRequest request, AppointmentResponse appointment) {
        Long currentId = resolveUserId(request);
        String roles = userRoles(request);
        boolean patient = hasRole(request, "PATIENT", roles);
        boolean doctor = hasRole(request, "DOCTOR", roles);
        if (!(patient && appointment.getPatientId().equals(currentId))
                && !(doctor && appointment.getDoctorId().equals(currentId))) {
            throw new UnauthorizedException("User is not authorized to access this appointment.");
        }
    }

    private void assertDoctorOwnsAppointment(HttpServletRequest request, Long appointmentId) {
        Long currentId = resolveUserId(request);
        if (!hasRole(request, "DOCTOR", userRoles(request))) {
            throw new UnauthorizedException("Only the assigned doctor can change this appointment.");
        }
        AppointmentResponse appointment = appointmentService.getAppointmentById(appointmentId);
        if (!appointment.getDoctorId().equals(currentId)) {
            throw new UnauthorizedException("Only the assigned doctor can change this appointment.");
        }
    }
}
