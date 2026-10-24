package com.rhc.authservice.service;

import com.fasterxml.jackson.annotation.JsonProperty;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.server.ResponseStatusException;

@Component
public class SupabaseIdentityVerifier {
    private final RestClient restClient;
    private final String projectUrl;
    private final String publishableKey;

    public SupabaseIdentityVerifier(
            RestClient.Builder restClientBuilder,
            @Value("${supabase.url:}") String projectUrl,
            @Value("${supabase.publishable-key:}") String publishableKey) {
        this.restClient = restClientBuilder.build();
        this.projectUrl = projectUrl == null ? "" : projectUrl.trim().replaceAll("/+$", "");
        this.publishableKey = publishableKey == null ? "" : publishableKey.trim();
    }

    public VerifiedIdentity verify(String accessToken) {
        if (accessToken == null || accessToken.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "A verified email session is required");
        }
        if (projectUrl.isBlank() || publishableKey.isBlank()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Email verification is not configured on the authentication service");
        }

        try {
            SupabaseUser user = restClient.get()
                    .uri(projectUrl + "/auth/v1/user")
                    .header("apikey", publishableKey)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                    .retrieve()
                    .body(SupabaseUser.class);

            if (user == null || user.id() == null || user.id().isBlank()
                    || user.email() == null || user.email().isBlank()
                    || (blank(user.emailConfirmedAt()) && blank(user.confirmedAt()))) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                        "The Supabase session is invalid or its email is not verified");
            }
            return new VerifiedIdentity(user.id(), user.email().trim());
        } catch (ResponseStatusException exception) {
            throw exception;
        } catch (RestClientResponseException exception) {
            if (exception.getStatusCode().value() == 401 || exception.getStatusCode().value() == 403
                    || exception.getStatusCode().value() == 400) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                        "The email verification code is invalid or expired");
            }
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Email verification is temporarily unavailable");
        } catch (RestClientException exception) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Email verification is temporarily unavailable");
        }
    }

    private static boolean blank(String value) {
        return value == null || value.isBlank();
    }

    public record VerifiedIdentity(String id, String email) { }

    private record SupabaseUser(
            String id,
            String email,
            @JsonProperty("email_confirmed_at") String emailConfirmedAt,
            @JsonProperty("confirmed_at") String confirmedAt) { }
}
