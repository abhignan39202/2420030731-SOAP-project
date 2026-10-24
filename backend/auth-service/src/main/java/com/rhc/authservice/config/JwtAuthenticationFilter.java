package com.rhc.authservice.config;

import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import java.util.Collection;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private final JwtUtil jwt;
    public JwtAuthenticationFilter(JwtUtil jwt) { this.jwt = jwt; }
    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return java.util.Set.of("/api/auth/login", "/api/auth/register").contains(path)
                || path.startsWith("/api/auth/supabase/");
    }
    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            try {
                Claims claims = jwt.extractAllClaims(header.substring(7));
                if (claims.getSubject() == null || !(claims.get("roles") instanceof Collection<?> roles)) {
                    response.sendError(401); return;
                }
                var authorities = roles.stream().map(Object::toString)
                        .map(role -> new SimpleGrantedAuthority(role.startsWith("ROLE_") ? role : "ROLE_" + role)).toList();
                SecurityContextHolder.getContext().setAuthentication(
                        new UsernamePasswordAuthenticationToken(claims.getSubject(), null, authorities));
            } catch (RuntimeException invalid) {
                SecurityContextHolder.clearContext();
                response.sendError(401); return;
            }
        }
        chain.doFilter(request, response);
    }
}
