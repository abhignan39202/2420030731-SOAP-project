package com.rhc.ambulanceservice.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.SERVICE_UNAVAILABLE)
public class NoAvailableAmbulanceException extends RuntimeException {
    public NoAvailableAmbulanceException(String message) {
        super(message);
    }
}
