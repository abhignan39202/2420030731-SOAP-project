package com.rhc.authservice.service;

import com.rhc.authservice.config.JwtUtil;
import com.rhc.authservice.dto.SupabaseRegisterRequest;
import com.rhc.authservice.entity.User;
import com.rhc.authservice.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceSupabaseTest {
    @Mock UserRepository users;
    @Mock PasswordEncoder passwords;
    @Mock JwtUtil jwt;

    @Test
    void verifiedRegistrationStoresSupabaseIdentityAndIssuesProjectJwt() {
        AuthService service = service();
        when(users.existsByUsername("patient-one")).thenReturn(false);
        when(users.findByEmailIgnoreCase("patient@example.test")).thenReturn(Optional.empty());
        when(users.findBySupabaseUserId("supabase-user-7")).thenReturn(Optional.empty());
        when(passwords.encode(anyString())).thenReturn("one-way-random-password");
        when(users.save(any(User.class))).thenAnswer(invocation -> {
            User saved = invocation.getArgument(0);
            saved.setId(44L);
            return saved;
        });
        when(jwt.generateToken("patient-one", java.util.Map.of("roles", Set.of("PATIENT"), "userId", 44L)))
                .thenReturn("project-session-jwt");

        SupabaseRegisterRequest request = new SupabaseRegisterRequest();
        request.setUsername("patient-one");
        request.setRoles(Set.of("PATIENT"));
        var response = service.registerSupabase(
                new SupabaseIdentityVerifier.VerifiedIdentity("supabase-user-7", "patient@example.test"), request);

        ArgumentCaptor<User> saved = ArgumentCaptor.forClass(User.class);
        verify(users).save(saved.capture());
        assertEquals("supabase-user-7", saved.getValue().getSupabaseUserId());
        assertEquals(Set.of("PATIENT"), saved.getValue().getRoles());
        assertEquals("project-session-jwt", response.getToken());
        assertEquals(44L, response.getId());
    }

    @Test
    void loginLinksExistingVerifiedEmailToSupabaseIdentity() {
        AuthService service = service();
        User existing = User.builder().id(17L).username("legacy-patient").email("patient@example.test")
                .password("already-hashed").roles(Set.of("PATIENT")).build();
        when(users.findBySupabaseUserId("supabase-user-7")).thenReturn(Optional.empty());
        when(users.findByEmailIgnoreCase("patient@example.test")).thenReturn(Optional.of(existing));
        when(users.save(existing)).thenReturn(existing);
        when(jwt.generateToken("legacy-patient", java.util.Map.of("roles", Set.of("PATIENT"), "userId", 17L)))
                .thenReturn("project-session-jwt");

        var response = service.loginSupabase(
                new SupabaseIdentityVerifier.VerifiedIdentity("supabase-user-7", "patient@example.test"));

        assertEquals("supabase-user-7", existing.getSupabaseUserId());
        assertEquals("project-session-jwt", response.getToken());
        verify(users).save(existing);
    }

    @Test
    void registrationCannotAssignStaffRole() {
        AuthService service = service();
        SupabaseRegisterRequest request = new SupabaseRegisterRequest();
        request.setUsername("staff-account");
        request.setRoles(Set.of("AMBULANCE_OPERATOR"));

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> service.registerSupabase(
                        new SupabaseIdentityVerifier.VerifiedIdentity("supabase-user-8", "operator@example.test"), request));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
    }

    @Test
    void loginRejectsSupabaseIdentityAlreadyBoundToDifferentUser() {
        AuthService service = service();
        User existing = User.builder().id(17L).username("patient").email("patient@example.test")
                .password("hash").roles(Set.of("PATIENT")).supabaseUserId("other-supabase-id").build();
        when(users.findBySupabaseUserId("supabase-user-7")).thenReturn(Optional.empty());
        when(users.findByEmailIgnoreCase("patient@example.test")).thenReturn(Optional.of(existing));

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> service.loginSupabase(
                        new SupabaseIdentityVerifier.VerifiedIdentity("supabase-user-7", "patient@example.test")));

        assertEquals(HttpStatus.UNAUTHORIZED, exception.getStatusCode());
    }

    private AuthService service() {
        AuthService service = new AuthService(users, passwords, jwt);
        ReflectionTestUtils.setField(service, "adminRegistrationCode", "test-admin-code");
        return service;
    }
}
