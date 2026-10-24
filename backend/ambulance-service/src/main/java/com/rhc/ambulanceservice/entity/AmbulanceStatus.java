package com.rhc.ambulanceservice.entity;

public enum AmbulanceStatus {
    AVAILABLE, ASSIGNED, EN_ROUTE, ON_SCENE, PATIENT_TRANSPORTING, UNAVAILABLE;

    public boolean canTransitionTo(AmbulanceStatus target) {
        return switch (this) {
            case AVAILABLE -> target == ASSIGNED || target == UNAVAILABLE;
            case ASSIGNED -> target == EN_ROUTE || target == AVAILABLE;
            case EN_ROUTE -> target == ON_SCENE;
            case ON_SCENE -> target == PATIENT_TRANSPORTING;
            case PATIENT_TRANSPORTING -> target == AVAILABLE;
            case UNAVAILABLE -> target == AVAILABLE;
        };
    }
}
