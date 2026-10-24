package com.rhc.prescriptionservice.service;

import com.rhc.prescriptionservice.dto.PrescriptionScanDraftRequest;
import com.rhc.prescriptionservice.entity.PrescriptionScanDraft;
import com.rhc.prescriptionservice.entity.ScanDraftStatus;
import com.rhc.prescriptionservice.exception.ResourceNotFoundException;
import com.rhc.prescriptionservice.repository.PrescriptionScanDraftRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PrescriptionScanDraftServiceTest {
    @Mock PrescriptionScanDraftRepository repository;
    @InjectMocks PrescriptionScanDraftService service;

    @Test
    void confirmedPatientTextCreatesOnlyAnUnfinalizedDraft() {
        PrescriptionScanDraftRequest request = new PrescriptionScanDraftRequest();
        request.setReviewedText("  Patient-reviewed prescription text  ");
        when(repository.save(any())).thenAnswer(invocation -> {
            PrescriptionScanDraft draft = invocation.getArgument(0);
            draft.setId(12L);
            return draft;
        });

        var result = service.create(41L, request);

        assertEquals(41L, result.getPatientId());
        assertEquals("Patient-reviewed prescription text", result.getReviewedText());
        assertEquals(ScanDraftStatus.DRAFT, result.getStatus());
        verify(repository).save(any(PrescriptionScanDraft.class));
    }

    @Test
    void patientCanCancelTheirOwnDraft() {
        PrescriptionScanDraft draft = PrescriptionScanDraft.builder().id(12L).patientId(41L)
                .reviewedText("Reviewed text").status(ScanDraftStatus.DRAFT).build();
        when(repository.findByIdAndPatientId(12L, 41L)).thenReturn(Optional.of(draft));
        when(repository.save(draft)).thenReturn(draft);

        var result = service.cancel(12L, 41L);

        assertEquals(ScanDraftStatus.CANCELLED, result.getStatus());
    }

    @Test
    void anotherPatientCannotCancelTheDraft() {
        when(repository.findByIdAndPatientId(12L, 99L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> service.cancel(12L, 99L));
        verify(repository, never()).save(any());
    }
}
