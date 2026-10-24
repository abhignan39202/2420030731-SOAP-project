package com.rhc.prescriptionservice.ocr;

import com.google.auth.oauth2.AccessToken;
import com.google.auth.oauth2.GoogleCredentials;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.util.Date;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.http.HttpMethod.POST;

class GoogleVisionOcrProviderTest {
    @Test
    void returnsTextFromConfiguredVisionOcrResponse() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        GoogleVisionOcrProvider provider = new GoogleVisionOcrProvider(builder);
        ReflectionTestUtils.setField(provider, "credentialsPath", "/run/secrets/google-vision.json");
        ReflectionTestUtils.setField(provider, "credentials", GoogleCredentials.create(
                new AccessToken("test-token", new Date(System.currentTimeMillis() + 3_600_000))));
        server.expect(requestTo("https://vision.googleapis.com/v1/images:annotate"))
                .andExpect(method(POST))
                .andExpect(header("Authorization", "Bearer test-token"))
                .andRespond(withSuccess("{\"responses\":[{\"fullTextAnnotation\":{\"text\":\"Extracted prescription text\"}}]}", MediaType.APPLICATION_JSON));

        assertEquals("Extracted prescription text", provider.extractText(new byte[]{1, 2, 3}, "image/png"));
        server.verify();
    }

    @Test
    void refusesToReturnTextWhenProviderIsNotConfigured() {
        GoogleVisionOcrProvider provider = new GoogleVisionOcrProvider(RestClient.builder());
        ReflectionTestUtils.setField(provider, "credentialsPath", "");

        assertThrows(OcrUnavailableException.class, () -> provider.extractText(new byte[]{1}, "image/png"));
    }

    @Test
    void explainsWhenGoogleCloudBillingIsDisabled() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        GoogleVisionOcrProvider provider = new GoogleVisionOcrProvider(builder);
        ReflectionTestUtils.setField(provider, "credentialsPath", "/run/secrets/google-vision.json");
        ReflectionTestUtils.setField(provider, "credentials", GoogleCredentials.create(
                new AccessToken("test-token", new Date(System.currentTimeMillis() + 3_600_000))));
        server.expect(requestTo("https://vision.googleapis.com/v1/images:annotate"))
                .andRespond(withStatus(HttpStatus.FORBIDDEN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"error\":{\"code\":403,\"status\":\"PERMISSION_DENIED\",\"details\":[{\"reason\":\"BILLING_DISABLED\"}]}}"));

        OcrUnavailableException error = assertThrows(OcrUnavailableException.class,
                () -> provider.extractText(new byte[]{1}, "image/png"));
        assertTrue(error.getMessage().contains("billing is disabled"));
        server.verify();
    }
}
