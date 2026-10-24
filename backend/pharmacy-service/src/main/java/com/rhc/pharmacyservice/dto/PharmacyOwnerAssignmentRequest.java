package com.rhc.pharmacyservice.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record PharmacyOwnerAssignmentRequest(
        @NotNull @Positive Long ownerUserId) {
}
