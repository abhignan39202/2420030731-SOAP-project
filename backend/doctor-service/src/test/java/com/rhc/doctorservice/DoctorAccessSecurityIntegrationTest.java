package com.rhc.doctorservice;

import com.rhc.doctorservice.repository.DoctorRepository;
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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class DoctorAccessSecurityIntegrationTest {
    private static final String JWT_SECRET = "404E635266556A586E3272357538782F413F4528462B4B6250645367566B5970";

    @Autowired MockMvc mvc;
    @Autowired DoctorRepository doctors;

    @BeforeEach
    void clearDoctors() { doctors.deleteAll(); }

    @Test
    void doctorOwnsProfileAndOnlyAdminCanVerifyIt() throws Exception {
        String body = """
                {"fullName":"Doctor One","specialization":"General Medicine","qualification":"MBBS","yearsOfExperience":8}
                """;
        mvc.perform(post("/api/doctors/401/profile")
                        .header(HttpHeaders.AUTHORIZATION, token(401L, "PATIENT"))
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isForbidden());

        mvc.perform(post("/api/doctors/401/profile")
                        .header(HttpHeaders.AUTHORIZATION, token(401L, "DOCTOR"))
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk());

        mvc.perform(patch("/api/doctors/401/availability?available=false")
                        .header(HttpHeaders.AUTHORIZATION, token(402L, "DOCTOR"))
                        .header("X-User-Id", "401"))
                .andExpect(status().isForbidden());

        mvc.perform(patch("/api/doctors/401/verify?status=APPROVED")
                        .header(HttpHeaders.AUTHORIZATION, token(401L, "DOCTOR")))
                .andExpect(status().isForbidden());

        mvc.perform(patch("/api/doctors/401/verify?status=APPROVED")
                        .header(HttpHeaders.AUTHORIZATION, token(900L, "ADMIN")))
                .andExpect(status().isOk());

        assertEquals("APPROVED", doctors.findById(401L).orElseThrow().getStatus().name());
        mvc.perform(get("/api/doctors")).andExpect(status().isOk());
    }

    private String token(Long userId, String role) {
        return "Bearer " + Jwts.builder().claims(Map.of("userId", userId, "roles", Set.of(role)))
                .subject("user-" + userId).issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + 60_000))
                .signWith(Keys.hmacShaKeyFor(JWT_SECRET.getBytes(StandardCharsets.UTF_8))).compact();
    }
}
