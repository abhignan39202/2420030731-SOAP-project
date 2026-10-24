package com.rhc.pharmacyservice.config;

import feign.RequestInterceptor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

@Configuration
public class FeignAuthConfig {
    @Bean
    public RequestInterceptor bearerTokenForwarder() {
        return template -> {
            if (RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attributes) {
                String authorization = attributes.getRequest().getHeader("Authorization");
                if (authorization != null && authorization.startsWith("Bearer ")) {
                    template.header("Authorization", authorization);
                }
            }
        };
    }
}
