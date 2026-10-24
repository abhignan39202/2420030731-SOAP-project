package com.rhc.prescriptionservice.exception;

public class DuplicatePrescriptionException extends RuntimeException {
    public DuplicatePrescriptionException(String message) {
        super(message);
    }
}
