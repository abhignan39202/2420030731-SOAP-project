package com.rhc.userservice.controller;

import com.rhc.userservice.dto.*;
import com.rhc.userservice.service.UserService;
import jakarta.validation.Valid;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Collection;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {
    private final UserService userService;

    @PostMapping("/{userId}/profile")
    public ResponseEntity<PatientProfileResponse> createProfile(
            HttpServletRequest servletRequest,
            @PathVariable Long userId, 
            @Valid @RequestBody PatientProfileRequest request) {
        requireOwnPatient(servletRequest, userId);
        return ResponseEntity.ok(userService.createProfile(userId, request));
    }

    @GetMapping("/{userId}/profile")
    public ResponseEntity<PatientProfileResponse> getProfile(HttpServletRequest servletRequest, @PathVariable Long userId) {
        requireOwnPatient(servletRequest, userId);
        return ResponseEntity.ok(userService.getProfile(userId));
    }

    @PutMapping("/{userId}/profile")
    public ResponseEntity<PatientProfileResponse> updateProfile(
            HttpServletRequest servletRequest,
            @PathVariable Long userId, 
            @Valid @RequestBody PatientProfileRequest request) {
        requireOwnPatient(servletRequest, userId);
        return ResponseEntity.ok(userService.updateProfile(userId, request));
    }

    private void requireOwnPatient(HttpServletRequest request, Long pathUserId) {
        Object rawUserId = request.getAttribute("userId");
        if (!(rawUserId instanceof Number userId) || userId.longValue() != pathUserId
                || !hasRole(request.getAttribute("roles"), "PATIENT")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Patients may access only their own profile");
        }
    }

    private boolean hasRole(Object rawRoles, String expectedRole) {
        if (rawRoles instanceof Collection<?> roles) {
            return roles.stream().map(String::valueOf).map(role -> role.startsWith("ROLE_") ? role.substring(5) : role)
                    .anyMatch(expectedRole::equals);
        }
        return false;
    }
}
