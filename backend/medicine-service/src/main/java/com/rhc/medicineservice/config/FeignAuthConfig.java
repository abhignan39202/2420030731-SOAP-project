package com.rhc.medicineservice.config;

import feign.RequestInterceptor;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/** Forwards the authenticated caller context across service-to-service calls. */
@Configuration
public class FeignAuthConfig {

    @Bean
    public RequestInterceptor callerContextForwarder() {
        return template -> {
            var attributes = RequestContextHolder.getRequestAttributes();
            if (!(attributes instanceof ServletRequestAttributes servletAttributes)) return;
            HttpServletRequest request = servletAttributes.getRequest();
            copyHeader(request, template, "Authorization");
        };
    }

    private void copyHeader(HttpServletRequest request, feign.RequestTemplate template, String name) {
        String value = request.getHeader(name);
        if (value != null && !value.isBlank()) {
            template.header(name, value);
        }
    }
}
