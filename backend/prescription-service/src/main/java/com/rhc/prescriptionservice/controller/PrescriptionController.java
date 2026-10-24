package com.rhc.prescriptionservice.controller;

import com.rhc.prescriptionservice.dto.PrescriptionCreateRequest;
import com.rhc.prescriptionservice.dto.PrescriptionResponse;
import com.rhc.prescriptionservice.dto.PrescriptionSummaryResponse;
import com.rhc.prescriptionservice.exception.UnauthorizedException;
import com.rhc.prescriptionservice.service.PrescriptionService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Collection;
import java.util.List;

@RestController
@RequestMapping("/api/prescriptions")
@RequiredArgsConstructor
public class PrescriptionController {

    private final PrescriptionService prescriptionService;

    @PostMapping
    public ResponseEntity<PrescriptionResponse> createPrescription(
            HttpServletRequest requestContext, @Valid @RequestBody PrescriptionCreateRequest request) {
        Long userId = requireRole(requestContext, "DOCTOR");
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(prescriptionService.createPrescription(userId, request));
    }

    @GetMapping("/{id}")
    public ResponseEntity<PrescriptionResponse> getPrescriptionById(
            @PathVariable Long id, HttpServletRequest requestContext) {
        Long userId = requireAnyRole(requestContext, "PATIENT", "DOCTOR");
        return ResponseEntity.ok(prescriptionService.getPrescriptionById(
                id, userId, hasRole(requestContext, "DOCTOR")));
    }

    @GetMapping("/patient/{patientId}")
    public ResponseEntity<List<PrescriptionSummaryResponse>> getPrescriptionsByPatient(
            @PathVariable Long patientId, HttpServletRequest requestContext) {
        Long userId = requireRole(requestContext, "PATIENT");
        if (!patientId.equals(userId)) throw new UnauthorizedException("Patients may access only their own prescriptions");
        return ResponseEntity.ok(prescriptionService.getPrescriptionsByPatient(patientId));
    }

    @GetMapping("/doctor/{doctorId}")
    public ResponseEntity<List<PrescriptionSummaryResponse>> getPrescriptionsByDoctor(
            @PathVariable Long doctorId, HttpServletRequest requestContext) {
        Long userId = requireRole(requestContext, "DOCTOR");
        if (!doctorId.equals(userId)) throw new UnauthorizedException("Doctors may access only their own prescriptions");
        return ResponseEntity.ok(prescriptionService.getPrescriptionsByDoctor(doctorId));
    }

    @GetMapping("/consultation/{consultationId}")
    public ResponseEntity<PrescriptionResponse> getPrescriptionByConsultation(
            @PathVariable Long consultationId, HttpServletRequest request) {
        Long userId = requireAnyRole(request, "PATIENT", "DOCTOR");
        return ResponseEntity.ok(prescriptionService.getPrescriptionByConsultation(
                consultationId, userId, hasRole(request, "DOCTOR")));
    }

    @PatchMapping("/{id}/finalize")
    public ResponseEntity<PrescriptionResponse> finalizePrescription(
            @PathVariable Long id, HttpServletRequest requestContext) {
        return ResponseEntity.ok(prescriptionService.finalizePrescription(id, requireRole(requestContext, "DOCTOR")));
    }

    @PatchMapping("/{id}/cancel")
    public ResponseEntity<PrescriptionResponse> cancelPrescription(
            @PathVariable Long id, HttpServletRequest requestContext) {
        return ResponseEntity.ok(prescriptionService.cancelPrescription(id, requireRole(requestContext, "DOCTOR")));
    }

    @PutMapping("/{id}")
    public ResponseEntity<PrescriptionResponse> updateDraftPrescription(
            @PathVariable Long id,
            HttpServletRequest requestContext,
            @Valid @RequestBody PrescriptionCreateRequest request) {
        return ResponseEntity.ok(prescriptionService.updateDraftPrescription(
                id, requireRole(requestContext, "DOCTOR"), request));
    }

    private Long requireRole(HttpServletRequest request, String expectedRole) {
        Long userId = authenticatedUserId(request);
        if (!hasRole(request, expectedRole)) {
            throw new UnauthorizedException("Only " + expectedRole.toLowerCase() + " users may perform this operation");
        }
        return userId;
    }

    private Long requireAnyRole(HttpServletRequest request, String... expectedRoles) {
        Long userId = authenticatedUserId(request);
        for (String role : expectedRoles) if (hasRole(request, role)) return userId;
        throw new UnauthorizedException("This operation is not available to the authenticated role");
    }

    private Long authenticatedUserId(HttpServletRequest request) {
        Object value = request.getAttribute("userId");
        if (value instanceof Number number) return number.longValue();
        if (value instanceof String text && !text.isBlank()) return Long.valueOf(text);
        throw new UnauthorizedException("Authenticated user ID is required");
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
}
