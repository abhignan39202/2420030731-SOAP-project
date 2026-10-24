package com.rhc.authservice.controller;

import com.rhc.authservice.dto.AuthResponse;
import com.rhc.authservice.dto.SupabaseRegisterRequest;
import com.rhc.authservice.service.AuthService;
import com.rhc.authservice.service.SupabaseIdentityVerifier;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/auth/supabase")
@RequiredArgsConstructor
public class SupabaseAuthController {
    private final AuthService authService;
    private final SupabaseIdentityVerifier identityVerifier;

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestHeader(value = "Authorization", required = false) String authorization) {
        var identity = identityVerifier.verify(bearerToken(authorization));
        return ResponseEntity.ok(authService.loginSupabase(identity));
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @Valid @RequestBody SupabaseRegisterRequest request) {
        var identity = identityVerifier.verify(bearerToken(authorization));
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.registerSupabase(identity, request));
    }

    private String bearerToken(String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ")
                || authorization.substring(7).isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "A verified email session is required");
        }
        return authorization.substring(7).trim();
    }
}
