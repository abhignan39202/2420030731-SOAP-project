package com.rhc.medicineservice.controller;

import com.rhc.medicineservice.dto.AdherenceSummaryResponse;
import com.rhc.medicineservice.dto.MedicationReminderResponse;
import com.rhc.medicineservice.dto.MedicationResponse;
import com.rhc.medicineservice.dto.MedicineDTO;
import com.rhc.medicineservice.exception.UnauthorizedException;
import com.rhc.medicineservice.service.MedicineService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Collection;
import java.util.List;

@RestController
@RequestMapping("/api/medicines")
@RequiredArgsConstructor
public class MedicineController {

    private final MedicineService medicineService;

    @GetMapping
    public ResponseEntity<List<MedicineDTO>> getAllMedicines() {
        return ResponseEntity.ok(medicineService.getAllMedicines());
    }

    @GetMapping("/{id}")
    public ResponseEntity<MedicineDTO> getMedicineById(@PathVariable("id") Long id) {
        return ResponseEntity.ok(medicineService.getMedicineById(id));
    }

    @PostMapping("/from-prescription/{prescriptionId}")
    public ResponseEntity<List<MedicationResponse>> createMedicationsFromPrescription(
            @PathVariable("prescriptionId") Long prescriptionId,
            HttpServletRequest request) {
        Long doctorId = requireRole(request, "DOCTOR");
        return ResponseEntity.ok(medicineService.createMedicationsFromPrescription(prescriptionId, doctorId));
    }

    private Long requireRole(HttpServletRequest request, String expected) {
        Object rawUserId = request.getAttribute("userId");
        Object rawRoles = request.getAttribute("roles");
        boolean rolePresent = rawRoles instanceof Collection<?> roles
                ? roles.stream().map(String::valueOf).map(role -> role.startsWith("ROLE_") ? role.substring(5) : role)
                    .anyMatch(expected::equals)
                : false;
        if (!(rawUserId instanceof Number userId) || !rolePresent) {
            throw new UnauthorizedException("Only the authenticated " + expected.toLowerCase() + " can use this operation");
        }
        return userId.longValue();
    }

    private Long requirePatient(HttpServletRequest request) {
        return requireRole(request, "PATIENT");
    }

    @GetMapping("/today")
    public ResponseEntity<List<MedicationReminderResponse>> getTodayReminders(HttpServletRequest request) {
        return ResponseEntity.ok(medicineService.getTodayReminders(requirePatient(request)));
    }

    @GetMapping("/reminders/upcoming")
    public ResponseEntity<List<MedicationReminderResponse>> getUpcomingReminders(HttpServletRequest request) {
        return ResponseEntity.ok(medicineService.getUpcomingReminders(requirePatient(request)));
    }

    @GetMapping("/reminders")
    public ResponseEntity<List<MedicationReminderResponse>> getPatientReminders(HttpServletRequest request) {
        return ResponseEntity.ok(medicineService.getPatientReminders(requirePatient(request)));
    }

    @PatchMapping("/reminders/{id}/taken")
    public ResponseEntity<Void> markReminderTaken(@PathVariable("id") Long id, HttpServletRequest request) {
        medicineService.markReminderTaken(id, requirePatient(request));
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/reminders/{id}/skipped")
    public ResponseEntity<Void> markReminderSkipped(@PathVariable("id") Long id, HttpServletRequest request) {
        medicineService.markReminderSkipped(id, requirePatient(request));
        return ResponseEntity.ok().build();
    }

    @GetMapping("/history")
    public ResponseEntity<List<MedicationReminderResponse>> getPatientHistory(
            HttpServletRequest request,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "10") int size) {
        return ResponseEntity.ok(medicineService.getPatientHistory(requirePatient(request), page, size));
    }

    @GetMapping("/adherence")
    public ResponseEntity<AdherenceSummaryResponse> getAdherenceSummary(HttpServletRequest request) {
        return ResponseEntity.ok(medicineService.getAdherenceSummary(requirePatient(request)));
    }
}
