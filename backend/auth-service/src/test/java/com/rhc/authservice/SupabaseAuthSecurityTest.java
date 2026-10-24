package com.rhc.authservice;

import com.rhc.authservice.config.JwtAuthenticationFilter;
import com.rhc.authservice.config.JwtUtil;
import com.rhc.authservice.config.SecurityConfig;
import com.rhc.authservice.controller.SupabaseAuthController;
import com.rhc.authservice.dto.AuthResponse;
import com.rhc.authservice.service.AuthService;
import com.rhc.authservice.service.SupabaseIdentityVerifier;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Set;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = SupabaseAuthController.class, properties = {
        "jwt.secret=supabase-security-test-secret-at-least-32-bytes", "jwt.expiration=60000"
})
@Import({SecurityConfig.class, JwtAuthenticationFilter.class, JwtUtil.class})
class SupabaseAuthSecurityTest {
    @Autowired MockMvc mvc;
    @MockitoBean AuthService authService;
    @MockitoBean SupabaseIdentityVerifier identityVerifier;

    @Test
    void acceptsSupabaseBearerForExchangeWithoutTreatingItAsProjectJwt() throws Exception {
        when(identityVerifier.verify("supabase-access-token"))
                .thenReturn(new SupabaseIdentityVerifier.VerifiedIdentity("supabase-id", "patient@example.test"));
        when(authService.loginSupabase(new SupabaseIdentityVerifier.VerifiedIdentity("supabase-id", "patient@example.test")))
                .thenReturn(AuthResponse.builder().token("project-jwt").username("patient")
                        .id(12L).roles(Set.of("PATIENT")).build());

        mvc.perform(post("/api/auth/supabase/login")
                        .header("Authorization", "Bearer supabase-access-token")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("project-jwt"))
                .andExpect(jsonPath("$.id").value(12));
    }

    @Test
    void rejectsExchangeWithoutSupabaseBearer() throws Exception {
        mvc.perform(post("/api/auth/supabase/login").contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());
    }
}
