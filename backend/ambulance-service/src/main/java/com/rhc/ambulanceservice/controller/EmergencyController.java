package com.rhc.ambulanceservice.controller;

import com.rhc.ambulanceservice.dto.*;
import com.rhc.ambulanceservice.service.EmergencyService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Collection;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class EmergencyController {

    private final EmergencyService emergencyService;

    @PostMapping("/emergency/request")
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<EmergencyResponse> createEmergencyRequest(
            @RequestAttribute("userId") Long patientId,
            @Valid @RequestBody EmergencyCreateRequest request) {
        return new ResponseEntity<>(emergencyService.createEmergencyRequest(patientId, request), HttpStatus.CREATED);
    }

    @GetMapping("/emergency/{id}")
    @PreAuthorize("hasAnyRole('PATIENT', 'AMBULANCE_OPERATOR')")
    public ResponseEntity<EmergencyResponse> getEmergencyById(
            @PathVariable("id") Long id,
            @RequestAttribute("userId") Long userId) {
        return ResponseEntity.ok(emergencyService.getEmergencyById(id, userId));
    }

    @GetMapping("/emergency/my-active")
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<EmergencyResponse> getMyActiveEmergency(@RequestAttribute("userId") Long patientId) {
        EmergencyResponse active = emergencyService.getMyActiveEmergency(patientId);
        return active == null ? ResponseEntity.noContent().build() : ResponseEntity.ok(active);
    }

    @GetMapping("/emergency/history")
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<List<EmergencyResponse>> getPatientHistory(@RequestAttribute("userId") Long patientId) {
        return ResponseEntity.ok(emergencyService.getPatientHistory(patientId));
    }

    @PatchMapping("/emergency/{id}/cancel")
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<EmergencyResponse> cancelEmergency(
            @PathVariable("id") Long id,
            @RequestAttribute("userId") Long patientId) {
        return ResponseEntity.ok(emergencyService.cancelEmergency(id, patientId));
    }

    /** Advances exactly one server-selected lifecycle step for the assigned operator. */
    @PatchMapping("/emergency/{id}/advance")
    @PreAuthorize("hasRole('AMBULANCE_OPERATOR')")
    public ResponseEntity<EmergencyResponse> advanceEmergencyStatus(
            @PathVariable("id") Long id,
            @RequestAttribute("userId") Long operatorUserId) {
        return ResponseEntity.ok(emergencyService.advanceEmergencyStatus(id, operatorUserId));
    }

    @GetMapping("/ambulance/operator/active")
    @PreAuthorize("hasRole('AMBULANCE_OPERATOR')")
    public ResponseEntity<EmergencyResponse> getOperatorActiveEmergency(
            @RequestAttribute("userId") Long operatorUserId) {
        EmergencyResponse active = emergencyService.getOperatorActiveEmergency(operatorUserId);
        return active == null ? ResponseEntity.noContent().build() : ResponseEntity.ok(active);
    }

    @GetMapping("/ambulance/operator/history")
    @PreAuthorize("hasRole('AMBULANCE_OPERATOR')")
    public ResponseEntity<List<EmergencyResponse>> getOperatorHistory(
            @RequestAttribute("userId") Long operatorUserId) {
        return ResponseEntity.ok(emergencyService.getOperatorHistory(operatorUserId));
    }

    @GetMapping("/ambulance/operators/{userId}")
    @PreAuthorize("hasRole('AMBULANCE_OPERATOR')")
    public ResponseEntity<OperatorResponse> getOperator(
            @PathVariable Long userId,
            @RequestAttribute("userId") Long requesterId) {
        if (!requesterId.equals(userId)) return ResponseEntity.status(403).build();
        return ResponseEntity.ok(emergencyService.getOperator(userId));
    }

    @PostMapping("/ambulance/operators")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<OperatorResponse> createOperator(@Valid @RequestBody OperatorCreateRequest request) {
        return new ResponseEntity<>(emergencyService.createOperator(request), HttpStatus.CREATED);
    }

    @PutMapping("/ambulance/operators/{userId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'AMBULANCE_OPERATOR')")
    public ResponseEntity<OperatorResponse> updateOperator(
            @PathVariable Long userId,
            @Valid @RequestBody OperatorCreateRequest request,
            @RequestAttribute("userId") Long requesterId,
            @RequestAttribute("roles") Collection<String> roles) {
        boolean isAdmin = roles.contains("ADMIN") || roles.contains("ROLE_ADMIN");
        if (!isAdmin && !requesterId.equals(userId)) return ResponseEntity.status(403).build();
        return ResponseEntity.ok(emergencyService.updateOperator(userId, request));
    }

    @PostMapping("/ambulances")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AmbulanceResponse> createAmbulance(@Valid @RequestBody AmbulanceCreateRequest request) {
        return new ResponseEntity<>(emergencyService.createAmbulance(request), HttpStatus.CREATED);
    }

    @GetMapping("/ambulances/available")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<AmbulanceResponse>> getAvailableAmbulances() {
        return ResponseEntity.ok(emergencyService.getAvailableAmbulances());
    }

    @GetMapping("/ambulances/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'AMBULANCE_OPERATOR')")
    public ResponseEntity<AmbulanceResponse> getAmbulanceById(
            @PathVariable("id") Long id,
            @RequestAttribute("userId") Long requesterId,
            @RequestAttribute("roles") Collection<String> roles) {
        boolean admin = roles.contains("ADMIN") || roles.contains("ROLE_ADMIN");
        return ResponseEntity.ok(emergencyService.getAmbulanceById(id, requesterId, admin));
    }

    @PatchMapping("/ambulances/{id}/location")
    @PreAuthorize("hasRole('AMBULANCE_OPERATOR')")
    public ResponseEntity<AmbulanceResponse> updateAmbulanceLocation(
            @PathVariable("id") Long id,
            @Valid @RequestBody LocationUpdateRequest request,
            @RequestAttribute("userId") Long operatorUserId) {
        return ResponseEntity.ok(emergencyService.updateAmbulanceLocation(id, request, operatorUserId));
    }
}
