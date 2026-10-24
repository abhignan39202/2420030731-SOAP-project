package com.rhc.doctorservice.exception;

public class DoctorNotFoundException extends RuntimeException {
    public DoctorNotFoundException(Long userId) {
        super("Doctor not found with ID: " + userId);
    }
}
