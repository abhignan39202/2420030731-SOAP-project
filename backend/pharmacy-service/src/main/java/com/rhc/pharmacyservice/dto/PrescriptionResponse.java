package com.rhc.pharmacyservice.dto;

import lombok.*;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PrescriptionResponse {
    private Long id;
    private Long consultationId;
    private Long patientId;
    private Long doctorId;
    private String status;
    private String diagnosis;
    private String generalInstructions;
    private List<PrescriptionItemResponse> items;
}
