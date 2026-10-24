package com.rhc.authservice.service;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;
import org.springframework.http.HttpStatus;

class SupabaseIdentityVerifierTest {
    private static final String URL = "https://demo-project.supabase.co";
    private static final String KEY = "sb_publishable_test-key";

    @Test
    void acceptsOnlySupabaseVerifiedEmailIdentity() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo(URL + "/auth/v1/user"))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header("apikey", KEY))
                .andExpect(header("Authorization", "Bearer verified-access-token"))
                .andRespond(withSuccess("""
                        {"id":"supabase-user-7","email":"patient@example.test","email_confirmed_at":"2026-10-22T08:00:00Z"}
                        """, MediaType.APPLICATION_JSON));

        var identity = new SupabaseIdentityVerifier(builder, URL, KEY).verify("verified-access-token");

        assertEquals("supabase-user-7", identity.id());
        assertEquals("patient@example.test", identity.email());
        server.verify();
    }

    @Test
    void rejectsUnconfirmedEmail() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo(URL + "/auth/v1/user"))
                .andRespond(withSuccess("""
                        {"id":"supabase-user-7","email":"patient@example.test"}
                        """, MediaType.APPLICATION_JSON));

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> new SupabaseIdentityVerifier(builder, URL, KEY).verify("not-confirmed"));

        assertEquals(HttpStatus.UNAUTHORIZED, exception.getStatusCode());
        server.verify();
    }

    @Test
    void mapsRejectedSupabaseTokenToUnauthorized() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo(URL + "/auth/v1/user"))
                .andRespond(withStatus(HttpStatus.UNAUTHORIZED));

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> new SupabaseIdentityVerifier(builder, URL, KEY).verify("expired-token"));

        assertEquals(HttpStatus.UNAUTHORIZED, exception.getStatusCode());
        server.verify();
    }
}
