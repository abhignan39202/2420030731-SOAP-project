package com.rhc.prescriptionservice.ocr;

import com.fasterxml.jackson.databind.JsonNode;
import com.google.auth.oauth2.AccessToken;
import com.google.auth.oauth2.GoogleCredentials;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import java.io.IOException;
import java.util.Base64;
import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class GoogleVisionOcrProvider implements OcrProvider {
    private static final String VISION_SCOPE = "https://www.googleapis.com/auth/cloud-vision";
    private final RestClient.Builder restClientBuilder;

    @Value("${GOOGLE_APPLICATION_CREDENTIALS:}")
    private String credentialsPath;
    private GoogleCredentials credentials;

    @Override
    public String extractText(byte[] imageBytes, String contentType) {
        if (credentialsPath == null || credentialsPath.isBlank()) {
            throw new OcrUnavailableException("Prescription scanning is not configured. Please try again later.");
        }

        String accessToken;
        try {
            GoogleCredentials currentCredentials = credentials();
            currentCredentials.refreshIfExpired();
            AccessToken token = currentCredentials.getAccessToken();
            if (token == null || token.getTokenValue() == null || token.getTokenValue().isBlank()) {
                throw new OcrUnavailableException("Prescription scanning authentication is unavailable. Please try again later.");
            }
            accessToken = token.getTokenValue();
        } catch (IOException ex) {
            throw new OcrUnavailableException("Prescription scanning authentication is unavailable. Please try again later.", ex);
        }

        Map<String, Object> image = Map.of("content", Base64.getEncoder().encodeToString(imageBytes));
        Map<String, Object> feature = Map.of("type", "DOCUMENT_TEXT_DETECTION");
        Map<String, Object> request = Map.of("image", image, "features", List.of(feature));
        Map<String, Object> body = Map.of("requests", List.of(request));

        JsonNode response;
        try {
            response = restClientBuilder.build().post()
                    .uri("https://vision.googleapis.com/v1/images:annotate")
                    .headers(headers -> headers.setBearerAuth(accessToken))
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(JsonNode.class);
        } catch (RestClientResponseException ex) {
            String providerError = ex.getResponseBodyAsString();
            if (ex.getStatusCode().value() == 403 && providerError.contains("BILLING_DISABLED")) {
                throw new OcrUnavailableException(
                        "Google Cloud Vision billing is disabled for this project. Enable billing in Google Cloud and try again.");
            }
            throw new OcrUnavailableException("The prescription scanning provider could not process the image. Please try again later.", ex);
        } catch (RestClientException ex) {
            throw new OcrUnavailableException("The prescription scanning provider could not process the image. Please try again later.", ex);
        }

        JsonNode first = response == null ? null : response.path("responses").path(0);
        if (first != null && first.has("error")) {
            throw new OcrUnavailableException("The prescription scanning provider could not process the image. Please try again later.");
        }
        String text = first == null ? "" : first.path("fullTextAnnotation").path("text").asText("");
        if (text.isBlank()) {
            throw new OcrNoTextException("No readable text was found. Try a clearer image with good lighting.");
        }
        return text;
    }

    private synchronized GoogleCredentials credentials() throws IOException {
        if (credentials == null) {
            credentials = GoogleCredentials.getApplicationDefault().createScoped(VISION_SCOPE);
        }
        return credentials;
    }
}
