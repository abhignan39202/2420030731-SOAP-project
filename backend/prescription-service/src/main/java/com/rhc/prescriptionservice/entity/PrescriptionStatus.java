package com.rhc.prescriptionservice.entity;

public enum PrescriptionStatus {
    DRAFT, FINALIZED, CANCELLED;

    public boolean canTransitionTo(PrescriptionStatus target) {
        if (this == DRAFT) {
            return target == FINALIZED || target == CANCELLED;
        } else if (this == FINALIZED) {
            return target == CANCELLED;
        } else if (this == CANCELLED) {
            return false;
        }
        return false;
    }
}
