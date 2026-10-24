package com.rhc.appointmentservice.controller;

import com.rhc.appointmentservice.dto.AvailabilityRequest;
import com.rhc.appointmentservice.dto.AvailabilityResponse;
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
@RequestMapping("/api/appointments/availability")
@RequiredArgsConstructor
public class AvailabilityController {

    private final AppointmentService appointmentService;

    @PostMapping
    public ResponseEntity<AvailabilityResponse> createAvailability(HttpServletRequest servletRequest, @Valid @RequestBody AvailabilityRequest request) {
        assertDoctor(servletRequest, request.getDoctorId());
        return ResponseEntity.status(HttpStatus.CREATED).body(appointmentService.createAvailability(request));
    }

    @GetMapping("/{doctorId}")
    public ResponseEntity<List<AvailabilityResponse>> getAvailability(
            @PathVariable Long doctorId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        if (date != null) {
            return ResponseEntity.ok(appointmentService.getAvailabilityByDoctorAndDate(doctorId, date));
        }
        return ResponseEntity.ok(appointmentService.getAvailabilityByDoctor(doctorId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAvailability(HttpServletRequest servletRequest, @PathVariable Long id) {
        assertDoctor(servletRequest, appointmentService.getAvailabilityById(id).getDoctorId());
        appointmentService.deleteAvailability(id);
        return ResponseEntity.noContent().build();
    }

    private void assertDoctor(HttpServletRequest request, Long doctorId) {
        Object current = request.getAttribute("userId");
        Object roles = request.getAttribute("roles");
        String roleText = roles == null ? "" : roles.toString();
        Long currentId;
        if (current instanceof Number number) {
            currentId = number.longValue();
        } else {
            currentId = null;
        }
        boolean doctorRole = java.util.Arrays.stream(roleText.split("[,\\s\\[\\]]+"))
                .map(role -> role.startsWith("ROLE_") ? role.substring(5) : role)
                .anyMatch("DOCTOR"::equals);
        if (currentId == null || !doctorId.equals(currentId) || !doctorRole) {
            throw new UnauthorizedException("Only the schedule owner can manage availability.");
        }
    }
}
