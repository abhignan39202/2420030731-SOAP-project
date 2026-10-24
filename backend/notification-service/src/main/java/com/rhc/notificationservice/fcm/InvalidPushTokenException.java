package com.rhc.notificationservice.fcm;

public class InvalidPushTokenException extends RuntimeException {
    public InvalidPushTokenException(String message, Throwable cause) { super(message, cause); }
}
