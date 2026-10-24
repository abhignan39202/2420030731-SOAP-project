package com.rhc.consultationservice.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Collection;

@Component
public class JwtUtil {

    @Value("${jwt.secret}")
    private String secret;

    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(secret.getBytes());
    }

    public Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public String extractUsername(String token) {
        return extractAllClaims(token).getSubject();
    }

    public Long extractUserId(String token) {
        Object userId = extractAllClaims(token).get("userId");
        if (userId instanceof Number number) {
            return number.longValue();
        }
        if (userId instanceof String value) {
            try {
                return Long.parseLong(value);
            } catch (NumberFormatException ignored) {
                // A malformed claim is treated as missing by the authentication filter.
            }
        }
        return null;
    }

    @SuppressWarnings("unchecked")
    public Collection<String> extractRoles(String token) {
        Claims claims = extractAllClaims(token);
        Object rolesObj = claims.get("roles");
        if (rolesObj instanceof Collection) {
            return (Collection<String>) rolesObj;
        }
        return java.util.Collections.emptyList();
    }

    public boolean validateToken(String token) {
        try {
            extractAllClaims(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }
}
