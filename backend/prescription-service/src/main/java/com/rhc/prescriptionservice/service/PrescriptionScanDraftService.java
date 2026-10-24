package com.rhc.prescriptionservice.service;

import com.rhc.prescriptionservice.dto.PrescriptionScanDraftRequest;
import com.rhc.prescriptionservice.dto.PrescriptionScanDraftResponse;
import com.rhc.prescriptionservice.entity.PrescriptionScanDraft;
import com.rhc.prescriptionservice.entity.ScanDraftStatus;
import com.rhc.prescriptionservice.exception.ResourceNotFoundException;
import com.rhc.prescriptionservice.repository.PrescriptionScanDraftRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service @RequiredArgsConstructor
public class PrescriptionScanDraftService {
    private final PrescriptionScanDraftRepository repository;

    @Transactional
    public PrescriptionScanDraftResponse create(Long patientId, PrescriptionScanDraftRequest request) {
        PrescriptionScanDraft draft = PrescriptionScanDraft.builder()
                .patientId(patientId).reviewedText(request.getReviewedText().trim()).status(ScanDraftStatus.DRAFT).build();
        return toResponse(repository.save(draft));
    }

    @Transactional(readOnly = true)
    public List<PrescriptionScanDraftResponse> findMine(Long patientId) {
        return repository.findAllByPatientIdOrderByCreatedAtDesc(patientId).stream().map(this::toResponse).toList();
    }

    @Transactional
    public PrescriptionScanDraftResponse cancel(Long id, Long patientId) {
        PrescriptionScanDraft draft = repository.findByIdAndPatientId(id, patientId)
                .orElseThrow(() -> new ResourceNotFoundException("Prescription scan draft not found"));
        draft.setStatus(ScanDraftStatus.CANCELLED);
        return toResponse(repository.save(draft));
    }

    private PrescriptionScanDraftResponse toResponse(PrescriptionScanDraft draft) {
        return PrescriptionScanDraftResponse.builder().id(draft.getId()).patientId(draft.getPatientId())
                .reviewedText(draft.getReviewedText()).status(draft.getStatus())
                .createdAt(draft.getCreatedAt()).updatedAt(draft.getUpdatedAt()).build();
    }
}
