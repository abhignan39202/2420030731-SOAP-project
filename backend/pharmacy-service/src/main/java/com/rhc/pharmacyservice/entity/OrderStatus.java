package com.rhc.pharmacyservice.entity;

public enum OrderStatus {
    PLACED, PROCESSING, READY, DISPATCHED, DELIVERED, CANCELLED,
    // Kept for rows created by earlier releases; API responses normalize these.
    CONFIRMED, PREPARING;

    public boolean canTransitionTo(OrderStatus target) {
        return switch (this) {
            case PLACED -> target == PROCESSING || target == CANCELLED;
            case PROCESSING, CONFIRMED, PREPARING -> target == READY || target == CANCELLED;
            case READY -> target == DISPATCHED || target == CANCELLED;
            case DISPATCHED -> target == DELIVERED;
            case DELIVERED, CANCELLED -> false;
        };
    }
}
