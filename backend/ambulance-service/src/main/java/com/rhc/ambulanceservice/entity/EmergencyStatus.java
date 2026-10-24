package com.rhc.ambulanceservice.entity;

public enum EmergencyStatus {
    REQUESTED, ASSIGNED, EN_ROUTE, ARRIVED, PATIENT_PICKED, HOSPITAL_REACHED, COMPLETED, CANCELLED;

    public boolean canTransitionTo(EmergencyStatus target) {
        return switch (this) {
            case REQUESTED -> target == ASSIGNED || target == CANCELLED;
            case ASSIGNED -> target == EN_ROUTE || target == CANCELLED;
            case EN_ROUTE -> target == ARRIVED || target == CANCELLED;
            case ARRIVED -> target == PATIENT_PICKED;
            case PATIENT_PICKED -> target == HOSPITAL_REACHED;
            case HOSPITAL_REACHED -> target == COMPLETED;
            case COMPLETED, CANCELLED -> false;
        };
    }

    public boolean isActive() {
        return this != COMPLETED && this != CANCELLED;
    }
}
