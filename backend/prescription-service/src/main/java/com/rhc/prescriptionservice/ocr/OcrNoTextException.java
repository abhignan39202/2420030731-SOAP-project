package com.rhc.prescriptionservice.ocr;

public class OcrNoTextException extends RuntimeException {
    public OcrNoTextException(String message) {
        super(message);
    }
}
