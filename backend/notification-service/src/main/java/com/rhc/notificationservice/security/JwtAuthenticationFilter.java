package com.rhc.notificationservice.security;

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
import org.springframework.web.filter.OncePerRequestFilter;

import javax.crypto.SecretKey;
import java.io.IOException;
import java.util.Collection;
import java.util.List;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private final SecretKey signingKey;

    public JwtAuthenticationFilter(@Value("${jwt.secret}") String secret) {
        this.signingKey = Keys.hmacShaKeyFor(secret.getBytes(java.nio.charset.StandardCharsets.UTF_8));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ") && SecurityContextHolder.getContext().getAuthentication() == null) {
            try {
                Claims claims = Jwts.parser().verifyWith(signingKey).build()
                        .parseSignedClaims(header.substring(7)).getPayload();
                Object idClaim = claims.get("userId");
                if (idClaim != null) {
                    Long userId = Long.valueOf(idClaim.toString());
                    AuthenticatedPrincipal principal = new AuthenticatedPrincipal(claims.getSubject(), userId);
                    List<SimpleGrantedAuthority> authorities = authorities(claims.get("roles"));
                    SecurityContextHolder.getContext().setAuthentication(
                            new UsernamePasswordAuthenticationToken(principal, null, authorities));
                }
            } catch (RuntimeException ignored) {
                SecurityContextHolder.clearContext();
            }
        }
        chain.doFilter(request, response);
    }

    private List<SimpleGrantedAuthority> authorities(Object rawRoles) {
        if (!(rawRoles instanceof Collection<?> roles)) return List.of();
        return roles.stream().map(Object::toString)
                .map(role -> role.startsWith("ROLE_") ? role : "ROLE_" + role)
                .map(SimpleGrantedAuthority::new).toList();
    }
}
