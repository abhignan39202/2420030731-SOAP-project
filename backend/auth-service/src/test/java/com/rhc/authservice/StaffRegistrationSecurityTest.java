package com.rhc.authservice;

import com.rhc.authservice.config.*;
import com.rhc.authservice.controller.AuthController;
import com.rhc.authservice.service.AuthService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.http.MediaType;
import java.util.Map;
import java.util.Set;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = AuthController.class, properties = {
    "jwt.secret=staff-security-test-secret-at-least-32-bytes", "jwt.expiration=60000"
})
@Import({SecurityConfig.class, JwtAuthenticationFilter.class, JwtUtil.class})
class StaffRegistrationSecurityTest {
    @Autowired MockMvc mvc;
    @Autowired JwtUtil jwt;
    @MockitoBean AuthService service;
    private final String request = """
        {"username":"staffuser","email":"staff@example.test","password":"test-password","roles":["PHARMACY"]}
        """;
    @Test void onlyAuthenticatedAdminCanCreateStaff() throws Exception {
        mvc.perform(post("/api/auth/staff").contentType(MediaType.APPLICATION_JSON).content(request))
            .andExpect(status().isUnauthorized());
        mvc.perform(post("/api/auth/staff").header("Authorization", "Bearer invalid")
            .contentType(MediaType.APPLICATION_JSON).content(request)).andExpect(status().isUnauthorized());
        String patient = jwt.generateToken("patient", Map.of("roles", Set.of("PATIENT"), "userId", 7));
        mvc.perform(post("/api/auth/staff").header("Authorization", "Bearer " + patient).header("X-User-Roles", "ADMIN")
            .contentType(MediaType.APPLICATION_JSON).content(request)).andExpect(status().isForbidden());
        when(service.registerStaff(any())).thenReturn(100L);
        String admin = jwt.generateToken("admin", Map.of("roles", Set.of("ADMIN"), "userId", 1));
        mvc.perform(post("/api/auth/staff").header("Authorization", "Bearer " + admin)
            .contentType(MediaType.APPLICATION_JSON).content(request)).andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").value(100));
    }
}
