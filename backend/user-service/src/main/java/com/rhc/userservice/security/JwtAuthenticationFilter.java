package com.rhc.userservice.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import javax.crypto.SecretKey;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Collection;
import java.util.List;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final SecretKey signingKey;

    public JwtAuthenticationFilter(@Value("${jwt.secret}") String secret) {
        this.signingKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String authorization = request.getHeader("Authorization");
        if (StringUtils.hasText(authorization) && authorization.startsWith("Bearer ")
                && SecurityContextHolder.getContext().getAuthentication() == null) {
            try {
                Claims claims = Jwts.parser().verifyWith(signingKey).build()
                        .parseSignedClaims(authorization.substring(7)).getPayload();
                Long userId = parseUserId(claims.get("userId"));
                String username = claims.getSubject();
                List<String> roles = parseRoles(claims.get("roles"), claims.get("role"));
                if (userId != null && username != null && !roles.isEmpty()) {
                    var authorities = roles.stream()
                            .map(role -> role.startsWith("ROLE_") ? role : "ROLE_" + role)
                            .map(SimpleGrantedAuthority::new)
                            .toList();
                    SecurityContextHolder.getContext().setAuthentication(
                            new UsernamePasswordAuthenticationToken(username, null, authorities));
                    request.setAttribute("userId", userId);
                    request.setAttribute("roles", roles);
                    request.setAttribute("username", username);
                }
            } catch (RuntimeException ignored) {
                SecurityContextHolder.clearContext();
            }
        }
        chain.doFilter(request, response);
    }

    private Long parseUserId(Object value) {
        if (value instanceof Number number) return number.longValue();
        if (value instanceof String text) {
            try { return Long.parseLong(text); } catch (NumberFormatException ignored) { return null; }
        }
        return null;
    }

    private List<String> parseRoles(Object rolesClaim, Object legacyRoleClaim) {
        Object value = rolesClaim == null ? legacyRoleClaim : rolesClaim;
        if (value instanceof Collection<?> collection) {
            return collection.stream().map(Object::toString).map(String::trim).filter(role -> !role.isBlank()).toList();
        }
        if (value instanceof String text) {
            return List.of(text.split(",")).stream().map(String::trim).filter(role -> !role.isBlank()).toList();
        }
        return List.of();
    }
}
