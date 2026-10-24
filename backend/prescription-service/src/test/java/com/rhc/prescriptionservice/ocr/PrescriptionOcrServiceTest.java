package com.rhc.prescriptionservice.ocr;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class PrescriptionOcrServiceTest {
    private final OcrProvider provider = mock(OcrProvider.class);
    private final PrescriptionOcrService service = new PrescriptionOcrService(provider);

    PrescriptionOcrServiceTest() {
        ReflectionTestUtils.setField(service, "maxFileSizeBytes", 8L * 1024 * 1024);
        ReflectionTestUtils.setField(service, "maxImagePixels", 20_000_000L);
    }

    @Test
    void acceptsValidPngAndReturnsProviderTextForPatientReview() throws Exception {
        byte[] png = pngImage(2, 2);
        MockMultipartFile file = new MockMultipartFile("file", "prescription.png", "image/png", png);
        when(provider.extractText(png, "image/png")).thenReturn("Medicine information from OCR");

        PrescriptionOcrService.OcrResult result = service.scan(file);

        assertEquals("Medicine information from OCR", result.extractedText());
        verify(provider).extractText(png, "image/png");
    }

    @Test
    void rejectsUnsupportedFileTypeBeforeCallingProvider() {
        MockMultipartFile file = new MockMultipartFile("file", "prescription.pdf", "application/pdf", new byte[]{1, 2});

        assertThrows(InvalidPrescriptionImageException.class, () -> service.scan(file));
        verifyNoInteractions(provider);
    }

    @Test
    void rejectsImageMimeTypeWhenBytesAreNotAnImage() {
        MockMultipartFile file = new MockMultipartFile("file", "prescription.png", "image/png", "not an image".getBytes());

        assertThrows(InvalidPrescriptionImageException.class, () -> service.scan(file));
        verifyNoInteractions(provider);
    }

    @Test
    void rejectsEmptyUpload() {
        MockMultipartFile file = new MockMultipartFile("file", "", "image/png", new byte[0]);

        assertThrows(InvalidPrescriptionImageException.class, () -> service.scan(file));
        verifyNoInteractions(provider);
    }

    private byte[] pngImage(int width, int height) throws Exception {
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        ImageIO.write(image, "png", output);
        return output.toByteArray();
    }
}
