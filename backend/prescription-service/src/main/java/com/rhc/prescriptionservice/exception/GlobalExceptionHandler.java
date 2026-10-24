package com.rhc.prescriptionservice.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import com.rhc.prescriptionservice.ocr.InvalidPrescriptionImageException;
import com.rhc.prescriptionservice.ocr.OcrNoTextException;
import com.rhc.prescriptionservice.ocr.OcrUnavailableException;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleResourceNotFoundException(ResourceNotFoundException ex) {
        Map<String, Object> error = new HashMap<>();
        error.put("timestamp", LocalDateTime.now());
        error.put("status", HttpStatus.NOT_FOUND.value());
        error.put("error", "Not Found");
        error.put("message", ex.getMessage());
        return new ResponseEntity<>(error, HttpStatus.NOT_FOUND);
    }

    @ExceptionHandler(UnauthorizedException.class)
    public ResponseEntity<Map<String, Object>> handleUnauthorizedException(UnauthorizedException ex) {
        Map<String, Object> error = new HashMap<>();
        error.put("timestamp", LocalDateTime.now());
        error.put("status", HttpStatus.FORBIDDEN.value());
        error.put("error", "Forbidden");
        error.put("message", ex.getMessage());
        return new ResponseEntity<>(error, HttpStatus.FORBIDDEN);
    }

    @ExceptionHandler(InvalidStatusTransitionException.class)
    public ResponseEntity<Map<String, Object>> handleInvalidStatusTransitionException(InvalidStatusTransitionException ex) {
        Map<String, Object> error = new HashMap<>();
        error.put("timestamp", LocalDateTime.now());
        error.put("status", HttpStatus.BAD_REQUEST.value());
        error.put("error", "Bad Request");
        error.put("message", ex.getMessage());
        return new ResponseEntity<>(error, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(DuplicatePrescriptionException.class)
    public ResponseEntity<Map<String, Object>> handleDuplicatePrescriptionException(DuplicatePrescriptionException ex) {
        Map<String, Object> error = new HashMap<>();
        error.put("timestamp", LocalDateTime.now());
        error.put("status", HttpStatus.CONFLICT.value());
        error.put("error", "Conflict");
        error.put("message", ex.getMessage());
        return new ResponseEntity<>(error, HttpStatus.CONFLICT);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidationExceptions(MethodArgumentNotValidException ex) {
        Map<String, Object> error = new HashMap<>();
        error.put("timestamp", LocalDateTime.now());
        error.put("status", HttpStatus.BAD_REQUEST.value());
        error.put("error", "Validation Error");
        
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getAllErrors().forEach(e -> {
            String fieldName = ((FieldError) e).getField();
            String errorMessage = e.getDefaultMessage();
            errors.put(fieldName, errorMessage);
        });
        error.put("message", errors);
        
        return new ResponseEntity<>(error, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(InvalidPrescriptionImageException.class)
    public ResponseEntity<Map<String, Object>> handleInvalidPrescriptionImage(InvalidPrescriptionImageException ex) {
        return error(HttpStatus.BAD_REQUEST, "Invalid image", ex.getMessage());
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<Map<String, Object>> handleOversizedUpload(MaxUploadSizeExceededException ex) {
        return error(HttpStatus.BAD_REQUEST, "Invalid image", "Image must be 8 MB or smaller.");
    }

    @ExceptionHandler(OcrNoTextException.class)
    public ResponseEntity<Map<String, Object>> handleOcrNoText(OcrNoTextException ex) {
        return error(HttpStatus.UNPROCESSABLE_ENTITY, "No readable text", ex.getMessage());
    }

    @ExceptionHandler(OcrUnavailableException.class)
    public ResponseEntity<Map<String, Object>> handleOcrUnavailable(OcrUnavailableException ex) {
        return error(HttpStatus.SERVICE_UNAVAILABLE, "OCR unavailable", ex.getMessage());
    }

    private ResponseEntity<Map<String, Object>> error(HttpStatus status, String title, String message) {
        Map<String, Object> error = new HashMap<>();
        error.put("timestamp", LocalDateTime.now());
        error.put("status", status.value());
        error.put("error", title);
        error.put("message", message);
        return ResponseEntity.status(status).body(error);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGlobalException(Exception ex) {
        Map<String, Object> error = new HashMap<>();
        error.put("timestamp", LocalDateTime.now());
        error.put("status", HttpStatus.INTERNAL_SERVER_ERROR.value());
        error.put("error", "Internal Server Error");
        error.put("message", ex.getMessage());
        return new ResponseEntity<>(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}
