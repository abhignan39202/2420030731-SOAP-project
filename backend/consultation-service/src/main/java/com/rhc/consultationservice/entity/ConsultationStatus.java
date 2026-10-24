package com.rhc.consultationservice.entity;

public enum ConsultationStatus {
    SCHEDULED,
    IN_PROGRESS,
    COMPLETED,
    CANCELLED;

    public boolean canTransitionTo(ConsultationStatus target) {
        if (this == target) return true;
        return switch (this) {
            case SCHEDULED -> target == IN_PROGRESS || target == CANCELLED;
            case IN_PROGRESS -> target == COMPLETED || target == CANCELLED;
            case COMPLETED, CANCELLED -> false;
        };
    }
}
