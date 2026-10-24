package com.rhc.prescriptionservice.config;

import feign.RequestInterceptor;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/** Forwards the authenticated doctor's JWT to the consultation service. */
@Configuration
public class FeignAuthConfig {

    @Bean
    public RequestInterceptor bearerTokenForwarder() {
        return template -> {
            var attributes = RequestContextHolder.getRequestAttributes();
            if (!(attributes instanceof ServletRequestAttributes servletAttributes)) return;
            HttpServletRequest request = servletAttributes.getRequest();
            String authorization = request.getHeader("Authorization");
            if (authorization != null && !authorization.isBlank()) {
                template.header("Authorization", authorization);
            }
        };
    }
}
