package com.rhc.consultationservice.dto;

import lombok.*;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConsultationUpdateRequest {

    private String symptoms;
    private String clinicalNotes;
    private String diagnosis;
    private String followUpInstructions;
    private LocalDate followUpDate;
}
