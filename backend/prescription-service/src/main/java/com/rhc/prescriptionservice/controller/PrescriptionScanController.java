package com.rhc.prescriptionservice.controller;

import com.rhc.prescriptionservice.dto.PrescriptionScanDraftRequest;
import com.rhc.prescriptionservice.dto.PrescriptionScanDraftResponse;
import com.rhc.prescriptionservice.ocr.PrescriptionOcrService;
import com.rhc.prescriptionservice.service.PrescriptionScanDraftService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/prescriptions/scan")
@RequiredArgsConstructor
public class PrescriptionScanController {
    private final PrescriptionOcrService ocrService;
    private final PrescriptionScanDraftService draftService;

    @PostMapping(value = "/ocr", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, String>> scan(
            HttpServletRequest request,
            @RequestPart("file") MultipartFile file) {
        requirePatient(request);
        return ResponseEntity.ok(Map.of("extractedText", ocrService.scan(file).extractedText()));
    }

    @PostMapping("/drafts")
    public ResponseEntity<PrescriptionScanDraftResponse> confirm(
            HttpServletRequest request,
            @Valid @RequestBody PrescriptionScanDraftRequest draftRequest) {
        Long patientId = requirePatient(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(draftService.create(patientId, draftRequest));
    }

    @GetMapping("/drafts")
    public ResponseEntity<List<PrescriptionScanDraftResponse>> list(HttpServletRequest request) {
        return ResponseEntity.ok(draftService.findMine(requirePatient(request)));
    }

    @PatchMapping("/drafts/{id}/cancel")
    public ResponseEntity<PrescriptionScanDraftResponse> cancel(HttpServletRequest request, @PathVariable Long id) {
        return ResponseEntity.ok(draftService.cancel(id, requirePatient(request)));
    }

    private Long requirePatient(HttpServletRequest request) {
        Object roles = request.getAttribute("roles");
        Object userId = request.getAttribute("userId");
        if (!hasRole(roles, "PATIENT") || userId == null) {
            throw new com.rhc.prescriptionservice.exception.UnauthorizedException("Only authenticated patients can use prescription scanning");
        }
        if (userId instanceof Number number) return number.longValue();
        return Long.valueOf(String.valueOf(userId));
    }

    private boolean hasRole(Object rawRoles, String expectedRole) {
        if (rawRoles instanceof Iterable<?> roles) {
            for (Object role : roles) if (normalizeRole(role).equals(expectedRole)) return true;
            return false;
        }
        if (rawRoles == null) return false;
        return java.util.Arrays.stream(String.valueOf(rawRoles).replace("[", "").replace("]", "").split("[,\\s]+"))
                .map(this::normalizeRole)
                .anyMatch(expectedRole::equals);
    }

    private String normalizeRole(Object rawRole) {
        String role = String.valueOf(rawRole).trim().toUpperCase(java.util.Locale.ROOT);
        return role.startsWith("ROLE_") ? role.substring(5) : role;
    }
}
