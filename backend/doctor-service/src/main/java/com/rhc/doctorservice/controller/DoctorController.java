package com.rhc.doctorservice.controller;

import com.rhc.doctorservice.dto.*;
import com.rhc.doctorservice.entity.Doctor;
import com.rhc.doctorservice.service.DoctorService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Collection;
import java.util.List;

@RestController
@RequestMapping("/api/doctors")
@RequiredArgsConstructor
public class DoctorController {
    private final DoctorService doctorService;

    @PostMapping("/{userId}/profile")
    public ResponseEntity<DoctorProfileResponse> createProfile(
            HttpServletRequest requestContext,
            @PathVariable Long userId, 
            @Valid @RequestBody DoctorProfileRequest request) {
        requireOwnDoctor(requestContext, userId);
        return ResponseEntity.ok(doctorService.createProfile(userId, request));
    }

    @GetMapping("/search")
    public ResponseEntity<List<DoctorProfileResponse>> searchDoctors(
            @RequestParam String specialization) {
        return ResponseEntity.ok(doctorService.searchDoctors(specialization));
    }

    @GetMapping("/pending")
    public ResponseEntity<List<DoctorProfileResponse>> listPendingDoctors(HttpServletRequest requestContext) {
        requireRole(requestContext, "ADMIN");
        return ResponseEntity.ok(doctorService.listPendingDoctors());
    }

    @GetMapping
    public ResponseEntity<List<DoctorProfileResponse>> listDoctors() {
        return ResponseEntity.ok(doctorService.listDoctors());
    }

    @GetMapping("/{userId}")
    public ResponseEntity<DoctorProfileResponse> getDoctor(@PathVariable Long userId) {
        return ResponseEntity.ok(doctorService.getDoctorById(userId));
    }

    @PutMapping("/{userId}/profile")
    public ResponseEntity<DoctorProfileResponse> updateProfile(
            HttpServletRequest requestContext,
            @PathVariable Long userId,
            @Valid @RequestBody DoctorProfileRequest request) {
        requireOwnDoctor(requestContext, userId);
        return ResponseEntity.ok(doctorService.updateProfile(userId, request));
    }

    @PatchMapping("/{userId}/verify")
    public ResponseEntity<DoctorProfileResponse> verifyDoctor(
            HttpServletRequest requestContext,
            @PathVariable Long userId, 
            @RequestParam Doctor.VerificationStatus status) {
        requireRole(requestContext, "ADMIN");
        return ResponseEntity.ok(doctorService.updateVerificationStatus(userId, status));
    }

    @PatchMapping("/{userId}/availability")
    public ResponseEntity<Void> toggleAvailability(
            HttpServletRequest requestContext,
            @PathVariable Long userId, 
            @RequestParam boolean available) {
        requireOwnDoctor(requestContext, userId);
        doctorService.toggleAvailability(userId, available);
        return ResponseEntity.ok().build();
    }

    private void requireOwnDoctor(HttpServletRequest request, Long pathUserId) {
        Object rawUserId = request.getAttribute("userId");
        if (!(rawUserId instanceof Number userId) || userId.longValue() != pathUserId
                || !hasRole(request.getAttribute("roles"), "DOCTOR")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Doctors may manage only their own profile and availability");
        }
    }

    private void requireRole(HttpServletRequest request, String expectedRole) {
        if (!hasRole(request.getAttribute("roles"), expectedRole)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Only an administrator may verify doctor profiles");
        }
    }

    private boolean hasRole(Object rawRoles, String expectedRole) {
        if (rawRoles instanceof Collection<?> roles) {
            return roles.stream().map(String::valueOf).map(role -> role.startsWith("ROLE_") ? role.substring(5) : role)
                    .anyMatch(expectedRole::equals);
        }
        return false;
    }
}
