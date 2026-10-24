package com.rhc.authservice.service;

import com.rhc.authservice.dto.*;
import com.rhc.authservice.entity.User;
import com.rhc.authservice.repository.UserRepository;
import com.rhc.authservice.config.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    @Value("${ADMIN_REGISTRATION_CODE:}")
    private String adminRegistrationCode;

    public void register(RegisterRequest request) {
        Set<String> registrationRoles = normalizeRegistrationRoles(request.getRoles());
        validateAdminRegistration(registrationRoles, request.getAdminRegistrationCode());
        saveUser(request, registrationRoles);
    }

    public AuthResponse registerSupabase(
            SupabaseIdentityVerifier.VerifiedIdentity identity,
            SupabaseRegisterRequest request) {
        Set<String> registrationRoles = normalizeRegistrationRoles(request.getRoles());
        validateAdminRegistration(registrationRoles, request.getAdminRegistrationCode());

        if (userRepository.existsByUsername(request.getUsername())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Username already exists");
        }
        if (userRepository.findByEmailIgnoreCase(identity.email()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "An account already exists for this email. Sign in instead.");
        }
        if (userRepository.findBySupabaseUserId(identity.id()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "This verified email already has a Rural Health Companion account. Sign in instead.");
        }

        User user = User.builder()
                .username(request.getUsername().trim())
                .email(identity.email())
                // Password sign-in is no longer used by the web UI. Keep the legacy non-null DB column
                // populated with a random one-way value so it cannot be used as a password.
                .password(passwordEncoder.encode(UUID.randomUUID().toString()))
                .roles(registrationRoles)
                .supabaseUserId(identity.id())
                .build();
        return createSession(userRepository.save(user));
    }

    public AuthResponse loginSupabase(SupabaseIdentityVerifier.VerifiedIdentity identity) {
        User user = userRepository.findBySupabaseUserId(identity.id())
                .orElseGet(() -> userRepository.findByEmailIgnoreCase(identity.email())
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                                "No account exists for this verified email. Register first.")));

        if (user.getSupabaseUserId() != null && !user.getSupabaseUserId().equals(identity.id())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                    "This account is linked to a different verified identity");
        }
        if (user.getSupabaseUserId() == null) {
            user.setSupabaseUserId(identity.id());
            user = userRepository.save(user);
        }
        return createSession(user);
    }

    private void validateAdminRegistration(Set<String> registrationRoles, String suppliedCode) {
        if (!registrationRoles.contains("ADMIN")) return;
        if (suppliedCode == null || suppliedCode.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Admin registration requires a setup code");
        }
        if (adminRegistrationCode == null || adminRegistrationCode.isBlank()
                || !MessageDigest.isEqual(
                adminRegistrationCode.getBytes(StandardCharsets.UTF_8),
                suppliedCode.getBytes(StandardCharsets.UTF_8))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Admin registration requires a valid setup code");
        }
    }

    public Long registerStaff(RegisterRequest request) {
        if (request.getRoles() == null || request.getRoles().size() != 1
                || !Set.of("PHARMACY", "AMBULANCE_OPERATOR").contains(request.getRoles().iterator().next())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Select PHARMACY or AMBULANCE_OPERATOR for a staff account");
        }
        return saveUser(request, request.getRoles()).getId();
    }

    private User saveUser(RegisterRequest request, Set<String> registrationRoles) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Username already exists");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already exists");
        }

        User user = User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .roles(registrationRoles)
                .build();

        return userRepository.save(user);
    }

    private Set<String> normalizeRegistrationRoles(Set<String> requestedRoles) {
        if (requestedRoles == null || requestedRoles.size() != 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Registration must select exactly one role: PATIENT, DOCTOR, or ADMIN");
        }
        String role = requestedRoles.iterator().next();
        if (role == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Registration must select exactly one role: PATIENT, DOCTOR, or ADMIN");
        }
        String normalized = role.trim().toUpperCase(Locale.ROOT);
        if (normalized.startsWith("ROLE_")) normalized = normalized.substring(5);
        if (!Set.of("PATIENT", "DOCTOR", "ADMIN").contains(normalized)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Registration supports PATIENT, DOCTOR, or ADMIN only");
        }
        return Set.of(normalized);
    }

    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid username or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid username or password");
        }

        return createSession(user);
    }

    private AuthResponse createSession(User user) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("roles", user.getRoles());
        claims.put("userId", user.getId());

        String token = jwtUtil.generateToken(user.getUsername(), claims);

        return AuthResponse.builder()
                .token(token)
                .username(user.getUsername())
                .id(user.getId())
                .roles(user.getRoles())
                .build();
    }
}
