package com.rhc.ambulanceservice.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Collection;
import java.util.Collections;

@Component
public class JwtUtil {

    @Value("${jwt.secret}")
    private String secret;

    private SecretKey getSigningKey() {
        byte[] keyBytes = secret.getBytes(StandardCharsets.UTF_8);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    public String extractUsername(String token) {
        Claims claims = Jwts.parser()
            .verifyWith(getSigningKey())
            .build()
            .parseSignedClaims(token)
            .getPayload();
        return claims.getSubject();
    }

    public Long extractUserId(String token) {
        Object userId = Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload()
                .get("userId");
        if (userId instanceof Number number) return number.longValue();
        if (userId instanceof String value) {
            try {
                return Long.parseLong(value);
            } catch (NumberFormatException ignored) {
                return null;
            }
        }
        return null;
    }

    public Collection<String> extractRoles(String token) {
        Object roles = Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload()
                .get("roles");
        if (roles instanceof Collection<?> values) {
            return values.stream().filter(String.class::isInstance).map(String.class::cast).toList();
        }
        if (roles instanceof String role && !role.isBlank()) return Collections.singleton(role);
        return Collections.emptyList();
    }
}
