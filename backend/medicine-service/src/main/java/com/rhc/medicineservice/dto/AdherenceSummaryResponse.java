package com.rhc.medicineservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdherenceSummaryResponse {
    private long totalEligible;
    private long takenCount;
    private long missedCount;
    private long pendingCount;
    private long skippedCount;
    private double adherencePercentage;
}
