package com.rhc.authservice.dto;

import jakarta.validation.constraints.*;
import lombok.*;
import java.util.Set;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class RegisterRequest {
    @NotBlank @Size(min = 3, max = 20)
    private String username;
    
    @NotBlank @Email
    private String email;
    
    @NotBlank @Size(min = 6)
    private String password;
    
    @NotEmpty
    private Set<String> roles;

    private String adminRegistrationCode;
}
