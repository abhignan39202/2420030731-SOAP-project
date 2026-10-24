package com.rhc.consultationservice.exception;

public class DuplicateConsultationException extends RuntimeException {
    public DuplicateConsultationException(String message) {
        super(message);
    }
}
