package com.rhc.consultationservice.config;

import feign.RequestInterceptor;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/** Propagates the caller's JWT to protected service-to-service calls. */
@Configuration
public class FeignAuthConfig {

    @Bean
    public RequestInterceptor bearerTokenForwarder() {
        return template -> {
            var requestAttributes = RequestContextHolder.getRequestAttributes();
            if (!(requestAttributes instanceof ServletRequestAttributes attributes)) {
                return;
            }

            HttpServletRequest request = attributes.getRequest();
            String authorization = request.getHeader("Authorization");
            if (authorization != null && !authorization.isBlank()) {
                template.header("Authorization", authorization);
            }
        };
    }
}
