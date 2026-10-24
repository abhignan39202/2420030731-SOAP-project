package com.rhc.appointmentservice.exception;

public class DoctorValidationException extends RuntimeException {
    public DoctorValidationException(String message) {
        super(message);
    }
}
