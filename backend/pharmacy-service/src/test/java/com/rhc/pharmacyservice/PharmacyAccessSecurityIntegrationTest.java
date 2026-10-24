package com.rhc.pharmacyservice;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertNotEquals;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class PharmacyAccessSecurityIntegrationTest {
    private static final String JWT_SECRET = "404E635266556A586E3272357538782F413F4528462B4B6250645367566B5970";

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper objectMapper;

    @Test
    void missingOrInvalidBearerTokenReturnsUnauthorized() throws Exception {
        mvc.perform(get("/api/pharmacy/pharmacies/me"))
                .andExpect(status().isUnauthorized());

        mvc.perform(get("/api/pharmacy/pharmacies/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer invalid-token"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void pharmacyAdministrationRequiresAdminAndPharmacyDataIsOwnerScoped() throws Exception {
        String pharmacyRequest = """
                {"name":"Unauthorized Pharmacy","licenseNumber":"RHC-TEST-UNAUTH-01","address":"Test road"}
                """;
        mvc.perform(post("/api/pharmacy/pharmacies")
                        .header(HttpHeaders.AUTHORIZATION, token(10L, "PATIENT"))
                        .header("X-User-Roles", "ADMIN")
                        .contentType(MediaType.APPLICATION_JSON).content(pharmacyRequest))
                .andExpect(status().isForbidden());

        MvcResult created = mvc.perform(post("/api/pharmacy/pharmacies")
                        .header(HttpHeaders.AUTHORIZATION, token(900L, "ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Admin Pharmacy\",\"licenseNumber\":\"RHC-TEST-ADMIN-01\"}"))
                .andExpect(status().isCreated()).andReturn();
        long generatedPharmacyId = objectMapper.readTree(created.getResponse().getContentAsString()).get("id").asLong();
        assertNotEquals(701L, generatedPharmacyId, "The pharmacy row ID must not be treated as its account user ID");

        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch(
                        "/api/pharmacy/pharmacies/" + generatedPharmacyId + "/owner")
                        .header(HttpHeaders.AUTHORIZATION, token(10L, "PATIENT"))
                        .header("X-User-Roles", "ADMIN")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"ownerUserId\":701}"))
                .andExpect(status().isForbidden());
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch(
                        "/api/pharmacy/pharmacies/" + generatedPharmacyId + "/owner")
                        .header(HttpHeaders.AUTHORIZATION, token(900L, "ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"ownerUserId\":701}"))
                .andExpect(status().isOk());

        mvc.perform(get("/api/pharmacy/pharmacies/me")
                        .header(HttpHeaders.AUTHORIZATION, token(701L, "PHARMACY")))
                .andExpect(status().isOk())
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.id").value(generatedPharmacyId));
        mvc.perform(get("/api/pharmacy/pharmacies/me")
                        .header(HttpHeaders.AUTHORIZATION, token(703L, "PHARMACY")))
                .andExpect(status().isNotFound());
        mvc.perform(get("/api/pharmacy/pharmacies/me")
                        .header(HttpHeaders.AUTHORIZATION, token(701L, "PATIENT")))
                .andExpect(status().isForbidden());

        mvc.perform(get("/api/pharmacy/inventory/" + generatedPharmacyId)
                        .header(HttpHeaders.AUTHORIZATION, token(701L, "PHARMACY")))
                .andExpect(status().isOk());
        mvc.perform(get("/api/pharmacy/inventory/" + generatedPharmacyId)
                        .header(HttpHeaders.AUTHORIZATION, token(generatedPharmacyId, "PHARMACY")))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/pharmacy/inventory/" + generatedPharmacyId)
                        .header(HttpHeaders.AUTHORIZATION, token(703L, "PHARMACY")))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/pharmacy/orders/pharmacy/" + generatedPharmacyId)
                        .header(HttpHeaders.AUTHORIZATION, token(701L, "PHARMACY")))
                .andExpect(status().isOk());
        mvc.perform(get("/api/pharmacy/orders/pharmacy/" + generatedPharmacyId)
                        .header(HttpHeaders.AUTHORIZATION, token(2L, "PHARMACY")))
                .andExpect(status().isForbidden());
    }

    private String token(Long userId, String role) {
        return "Bearer " + Jwts.builder().claims(Map.of("userId", userId, "roles", Set.of(role)))
                .subject("user-" + userId).issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + 60_000))
                .signWith(Keys.hmacShaKeyFor(JWT_SECRET.getBytes(StandardCharsets.UTF_8))).compact();
    }
}
