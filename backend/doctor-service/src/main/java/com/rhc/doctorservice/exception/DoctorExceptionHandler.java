package com.rhc.doctorservice.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

@RestControllerAdvice
public class DoctorExceptionHandler {
    @ExceptionHandler(DoctorNotFoundException.class)
    public ResponseEntity<Map<String, String>> handleNotFound(DoctorNotFoundException exception) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of("message", exception.getMessage()));
    }
}
