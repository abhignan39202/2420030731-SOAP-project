package com.rhc.consultationservice.controller;

import com.rhc.consultationservice.dto.*;
import com.rhc.consultationservice.exception.UnauthorizedException;
import com.rhc.consultationservice.service.ConsultationService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Collection;
import java.util.List;

@RestController
@RequestMapping("/api/consultations")
@RequiredArgsConstructor
public class ConsultationController {

    private final ConsultationService consultationService;

    @PostMapping
    public ResponseEntity<ConsultationResponse> createConsultation(
            HttpServletRequest request, @Valid @RequestBody ConsultationCreateRequest createRequest) {
        Long patientId = requireRole(request, "PATIENT");
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(consultationService.createConsultation(patientId, createRequest));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ConsultationResponse> getConsultationById(HttpServletRequest request, @PathVariable Long id) {
        Long userId = requireAnyRole(request, "PATIENT", "DOCTOR");
        return ResponseEntity.ok(consultationService.getConsultationById(id, userId, hasRole(request, "DOCTOR")));
    }

    @GetMapping("/{id}/summary")
    public ResponseEntity<ConsultationSummaryResponse> getPatientConsultationSummary(
            HttpServletRequest request, @PathVariable Long id) {
        return ResponseEntity.ok(consultationService.getPatientConsultationSummary(id, requireRole(request, "PATIENT")));
    }

    @GetMapping("/patient/{patientId}")
    public ResponseEntity<List<ConsultationResponse>> getConsultationsByPatient(
            HttpServletRequest request, @PathVariable Long patientId) {
        assertPathIdentity(request, patientId, "PATIENT", "patient");
        return ResponseEntity.ok(consultationService.getConsultationsByPatient(patientId));
    }

    @GetMapping("/doctor/{doctorId}")
    public ResponseEntity<List<ConsultationResponse>> getConsultationsByDoctor(
            HttpServletRequest request, @PathVariable Long doctorId) {
        assertPathIdentity(request, doctorId, "DOCTOR", "doctor");
        return ResponseEntity.ok(consultationService.getConsultationsByDoctor(doctorId));
    }

    @GetMapping("/appointment/{appointmentId}")
    public ResponseEntity<ConsultationResponse> getConsultationByAppointment(
            HttpServletRequest request, @PathVariable Long appointmentId) {
        Long userId = requireAnyRole(request, "PATIENT", "DOCTOR");
        return ResponseEntity.ok(consultationService.getConsultationByAppointment(
                appointmentId, userId, hasRole(request, "DOCTOR")));
    }

    @PatchMapping("/{id}/start")
    public ResponseEntity<ConsultationResponse> startConsultation(HttpServletRequest request, @PathVariable Long id) {
        return ResponseEntity.ok(consultationService.startConsultation(id, requireRole(request, "DOCTOR")));
    }

    @PatchMapping("/{id}/update")
    public ResponseEntity<ConsultationResponse> updateConsultation(
            HttpServletRequest request, @PathVariable Long id,
            @Valid @RequestBody ConsultationUpdateRequest updateRequest) {
        return ResponseEntity.ok(consultationService.updateConsultation(
                id, requireRole(request, "DOCTOR"), updateRequest));
    }

    @PatchMapping("/{id}/complete")
    public ResponseEntity<ConsultationResponse> completeConsultation(HttpServletRequest request, @PathVariable Long id) {
        return ResponseEntity.ok(consultationService.completeConsultation(id, requireRole(request, "DOCTOR")));
    }

    @PatchMapping("/{id}/cancel")
    public ResponseEntity<ConsultationResponse> cancelConsultation(HttpServletRequest request, @PathVariable Long id) {
        Long userId = requireAnyRole(request, "PATIENT", "DOCTOR");
        return ResponseEntity.ok(consultationService.cancelConsultation(id, userId));
    }

    private Long requireRole(HttpServletRequest request, String expectedRole) {
        Long userId = authenticatedUserId(request);
        if (!hasRole(request, expectedRole)) {
            throw new UnauthorizedException("Only " + expectedRole.toLowerCase() + " users may perform this operation.");
        }
        return userId;
    }

    private Long requireAnyRole(HttpServletRequest request, String... expectedRoles) {
        Long userId = authenticatedUserId(request);
        for (String role : expectedRoles) if (hasRole(request, role)) return userId;
        throw new UnauthorizedException("This operation is not available to the authenticated role.");
    }

    private Long authenticatedUserId(HttpServletRequest request) {
        Object value = request.getAttribute("userId");
        if (value instanceof Number number) return number.longValue();
        if (value instanceof String text && !text.isBlank()) return Long.valueOf(text);
        throw new UnauthorizedException("Authenticated user ID is required.");
    }

    private boolean hasRole(HttpServletRequest request, String expectedRole) {
        Object rawRoles = request.getAttribute("roles");
        if (rawRoles instanceof Collection<?> roles) {
            return roles.stream().map(String::valueOf)
                    .map(role -> role.startsWith("ROLE_") ? role.substring(5) : role)
                    .anyMatch(expectedRole::equals);
        }
        if (rawRoles instanceof String roles) {
            return java.util.Arrays.stream(roles.split("[,\\s\\[\\]]+"))
                    .map(role -> role.startsWith("ROLE_") ? role.substring(5) : role)
                    .anyMatch(expectedRole::equals);
        }
        return false;
    }

    private void assertPathIdentity(HttpServletRequest request, Long pathUserId, String expectedRole, String resourceName) {
        Long currentUserId = requireRole(request, expectedRole);
        if (!pathUserId.equals(currentUserId)) {
            throw new UnauthorizedException("User is not authorized to access this " + resourceName + " consultation list.");
        }
    }
}
