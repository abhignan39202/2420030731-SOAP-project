package com.rhc.prescriptionservice.ocr;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.Iterator;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class PrescriptionOcrService {
    private final OcrProvider ocrProvider;

    @Value("${ocr.max-file-size-bytes:8388608}")
    private long maxFileSizeBytes;

    @Value("${ocr.max-image-pixels:20000000}")
    private long maxImagePixels;

    public OcrResult scan(MultipartFile file) {
        byte[] bytes = validateAndRead(file);
        String text = ocrProvider.extractText(bytes, file.getContentType());
        return new OcrResult(text);
    }

    private byte[] validateAndRead(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new InvalidPrescriptionImageException("Choose a prescription image to scan.");
        }
        if (file.getSize() > maxFileSizeBytes) {
            throw new InvalidPrescriptionImageException("Image must be 8 MB or smaller.");
        }

        String contentType = file.getContentType();
        if (contentType == null || !(contentType.equalsIgnoreCase("image/jpeg")
                || contentType.equalsIgnoreCase("image/png"))) {
            throw new InvalidPrescriptionImageException("Use a JPEG or PNG image.");
        }

        try {
            byte[] bytes = file.getBytes();
            try (ImageInputStream input = ImageIO.createImageInputStream(new ByteArrayInputStream(bytes))) {
                if (input == null) throw new InvalidPrescriptionImageException("The selected file is not a readable image.");
                Iterator<ImageReader> readers = ImageIO.getImageReaders(input);
                if (!readers.hasNext()) throw new InvalidPrescriptionImageException("The selected file is not a readable JPEG or PNG image.");
                ImageReader reader = readers.next();
                try {
                    reader.setInput(input, true, true);
                    String format = reader.getFormatName().toLowerCase(Locale.ROOT);
                    if (!format.equals("jpeg") && !format.equals("jpg") && !format.equals("png")) {
                        throw new InvalidPrescriptionImageException("Use a JPEG or PNG image.");
                    }
                    long pixels = (long) reader.getWidth(0) * reader.getHeight(0);
                    if (pixels <= 0 || pixels > maxImagePixels) {
                        throw new InvalidPrescriptionImageException("Image dimensions are too large to scan safely.");
                    }
                } finally {
                    reader.dispose();
                }
            }
            return bytes;
        } catch (IOException ex) {
            throw new InvalidPrescriptionImageException("The selected file is not a readable image.");
        }
    }

    public record OcrResult(String extractedText) {}
}
