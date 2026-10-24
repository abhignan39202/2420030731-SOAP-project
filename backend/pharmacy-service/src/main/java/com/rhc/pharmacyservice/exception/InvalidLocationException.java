package com.rhc.pharmacyservice.exception;

public class InvalidLocationException extends RuntimeException {
    public InvalidLocationException(String message) {
        super(message);
    }
}
