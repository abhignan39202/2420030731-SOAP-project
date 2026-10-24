package com.rhc.medicineservice.controller;

import com.rhc.medicineservice.dto.MedicationResponse;
import com.rhc.medicineservice.service.MedicineService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/medications")
@RequiredArgsConstructor
public class MedicationController {

    private final MedicineService medicineService;

    @GetMapping
    public ResponseEntity<List<MedicationResponse>> getPatientMedications(HttpServletRequest request) {
        Long patientId = requirePatient(request);
        return ResponseEntity.ok(medicineService.getPatientMedications(patientId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<MedicationResponse> getMedicationById(@PathVariable("id") Long id, HttpServletRequest request) {
        Long patientId = requirePatient(request);
        return ResponseEntity.ok(medicineService.getMedicationById(id, patientId));
    }

    private Long requirePatient(HttpServletRequest request) {
        Object rawUserId = request.getAttribute("userId");
        Object rawRoles = request.getAttribute("roles");
        boolean patient = rawRoles instanceof java.util.Collection<?> roles
                ? roles.stream().map(String::valueOf).map(role -> role.startsWith("ROLE_") ? role.substring(5) : role)
                    .anyMatch("PATIENT"::equals)
                : false;
        if (!(rawUserId instanceof Number userId) || !patient) {
            throw new com.rhc.medicineservice.exception.UnauthorizedException("Only authenticated patients may access medication records");
        }
        return userId.longValue();
    }
}
