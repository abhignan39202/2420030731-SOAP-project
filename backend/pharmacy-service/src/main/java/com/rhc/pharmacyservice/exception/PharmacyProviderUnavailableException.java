package com.rhc.pharmacyservice.exception;

public class PharmacyProviderUnavailableException extends RuntimeException {
    public PharmacyProviderUnavailableException(String message) {
        super(message);
    }

    public PharmacyProviderUnavailableException(String message, Throwable cause) {
        super(message, cause);
    }
}
