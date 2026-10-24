package com.rhc.authservice.service;

import com.rhc.authservice.config.JwtUtil;
import com.rhc.authservice.dto.RegisterRequest;
import com.rhc.authservice.entity.User;
import com.rhc.authservice.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceRegistrationSecurityTest {
    @Mock UserRepository users;
    @Mock PasswordEncoder passwords;
    @Mock JwtUtil jwtUtil;

    @Test
    void publicRegistrationCannotAssignPrivilegedRoles() {
        AuthService service = new AuthService(users, passwords, jwtUtil);
        RegisterRequest request = RegisterRequest.builder()
                .username("attacker").email("attacker@example.test").password("password123")
                .roles(Set.of("ADMIN")).build();

        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () -> service.register(request));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
        verify(users, never()).save(any(User.class));
    }

    @Test
    void publicRegistrationPersistsOnlyTheSelectedPatientOrDoctorRole() {
        when(users.existsByUsername("new-patient")).thenReturn(false);
        when(users.existsByEmail("patient@example.test")).thenReturn(false);
        when(passwords.encode("password123")).thenReturn("encoded");
        AuthService service = new AuthService(users, passwords, jwtUtil);
        RegisterRequest request = RegisterRequest.builder()
                .username("new-patient").email("patient@example.test").password("password123")
                .roles(Set.of("PATIENT")).build();

        service.register(request);

        ArgumentCaptor<User> saved = ArgumentCaptor.forClass(User.class);
        verify(users).save(saved.capture());
        assertEquals(Set.of("PATIENT"), saved.getValue().getRoles());
    }

    @Test
    void duplicateUsernameReturnsConflictWithoutSaving() {
        when(users.existsByUsername("existing")).thenReturn(true);
        AuthService service = new AuthService(users, passwords, jwtUtil);
        RegisterRequest request = RegisterRequest.builder()
                .username("existing").email("new@example.test").password("password123")
                .roles(Set.of("PATIENT")).build();

        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () -> service.register(request));

        assertEquals(HttpStatus.CONFLICT, exception.getStatusCode());
        verify(users, never()).save(any(User.class));
    }
}
