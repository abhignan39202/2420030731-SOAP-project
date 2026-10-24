package com.rhc.prescriptionservice.ocr;

public class InvalidPrescriptionImageException extends RuntimeException {
    public InvalidPrescriptionImageException(String message) {
        super(message);
    }
}
