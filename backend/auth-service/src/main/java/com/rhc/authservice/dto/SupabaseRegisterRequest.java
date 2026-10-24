package com.rhc.authservice.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.Set;

@Data
public class SupabaseRegisterRequest {
    @NotBlank
    @Size(min = 3, max = 20)
    private String username;

    @NotEmpty
    private Set<String> roles;

    private String adminRegistrationCode;
}
