package com.rhc.appointmentservice.entity;

public enum AppointmentStatus {
    REQUESTED,
    CONFIRMED,
    CANCELLED,
    COMPLETED,
    NO_SHOW;

    public boolean canTransitionTo(AppointmentStatus newStatus) {
        if (this == newStatus) return true;
        return switch (this) {
            case REQUESTED -> newStatus == CONFIRMED || newStatus == CANCELLED;
            case CONFIRMED -> newStatus == COMPLETED || newStatus == CANCELLED || newStatus == NO_SHOW;
            case CANCELLED, COMPLETED, NO_SHOW -> false;
        };
    }
}
