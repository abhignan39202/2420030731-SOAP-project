package com.rhc.prescriptionservice.ocr;

public interface OcrProvider {
    String extractText(byte[] imageBytes, String contentType);
}
