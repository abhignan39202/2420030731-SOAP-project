package com.rhc.authservice.dto;

import lombok.*;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class AuthResponse {
    private String token;
    private String username;
    private Long id;
    private java.util.Set<String> roles;
}
