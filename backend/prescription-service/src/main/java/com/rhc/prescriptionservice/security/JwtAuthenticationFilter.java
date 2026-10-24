package com.rhc.prescriptionservice.security;

import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Arrays;
import java.util.Collection;
import java.util.List;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");

        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);

            if (jwtUtil.validateToken(token)) {
                Claims claims = jwtUtil.extractAllClaims(token);
                String username = claims.getSubject();
                Object rolesClaim = claims.get("roles");
                String roles = rolesClaim instanceof Collection<?> collection
                        ? collection.stream().map(String::valueOf).collect(Collectors.joining(","))
                        : String.valueOf(rolesClaim == null ? "" : rolesClaim);
                Object userIdClaim = claims.get("userId");
                Long userId = userIdClaim instanceof Number number ? number.longValue()
                        : userIdClaim == null ? null : Long.valueOf(String.valueOf(userIdClaim));

                if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                    List<SimpleGrantedAuthority> authorities = Arrays.stream(roles.split(","))
                            .map(role -> new SimpleGrantedAuthority("ROLE_" + role.trim()))
                            .collect(Collectors.toList());

                    UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                            username, null, authorities);
                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                    SecurityContextHolder.getContext().setAuthentication(authToken);
                    
                    // We might need to pass userId through attributes for controllers to easily access it
                    request.setAttribute("userId", userId);
                    request.setAttribute("roles", roles);
                }
            }
        }

        filterChain.doFilter(request, response);
    }
}
