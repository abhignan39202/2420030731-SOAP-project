package com.rhc.userservice;

import com.rhc.userservice.repository.PatientProfileRepository;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.Map;
import java.util.Set;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class UserAccessSecurityIntegrationTest {
    private static final String JWT_SECRET = "404E635266556A586E3272357538782F413F4528462B4B6250645367566B5970";

    @Autowired MockMvc mvc;
    @Autowired PatientProfileRepository profiles;

    @BeforeEach
    void clearProfiles() { profiles.deleteAll(); }

    @Test
    void patientCanAccessOnlyTheirOwnProfileAndSpoofedHeadersDoNotChangeIdentity() throws Exception {
        String ownProfile = """
                {"fullName":"Patient One","phoneNumber":"555-0100","medicalHistory":"private"}
                """;
        mvc.perform(post("/api/users/101/profile")
                        .header(HttpHeaders.AUTHORIZATION, token(101L, "PATIENT"))
                        .contentType(MediaType.APPLICATION_JSON).content(ownProfile))
                .andExpect(status().isOk());

        mvc.perform(get("/api/users/101/profile")
                        .header(HttpHeaders.AUTHORIZATION, token(202L, "PATIENT"))
                        .header("X-User-Id", "101"))
                .andExpect(status().isForbidden());

        mvc.perform(put("/api/users/101/profile")
                        .header(HttpHeaders.AUTHORIZATION, token(202L, "PATIENT"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"fullName\":\"Hijacked\",\"phoneNumber\":\"555-9999\"}"))
                .andExpect(status().isForbidden());

        mvc.perform(get("/api/users/101/profile"))
                .andExpect(status().isUnauthorized());

        mvc.perform(get("/api/users/101/profile")
                        .header(HttpHeaders.AUTHORIZATION, token(303L, "ADMIN")))
                .andExpect(status().isForbidden());

        org.junit.jupiter.api.Assertions.assertEquals("Patient One", profiles.findById(101L).orElseThrow().getFullName());
    }

    @Test
    void missingOwnProfileReturnsNotFoundWithoutTreatingThePatientAsUnauthenticated() throws Exception {
        mvc.perform(get("/api/users/101/profile")
                        .header(HttpHeaders.AUTHORIZATION, token(101L, "PATIENT")))
                .andExpect(status().isNotFound());
    }

    private String token(Long userId, String role) {
        return "Bearer " + Jwts.builder().claims(Map.of("userId", userId, "roles", Set.of(role)))
                .subject("user-" + userId).issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + 60_000))
                .signWith(Keys.hmacShaKeyFor(JWT_SECRET.getBytes(StandardCharsets.UTF_8))).compact();
    }
}
