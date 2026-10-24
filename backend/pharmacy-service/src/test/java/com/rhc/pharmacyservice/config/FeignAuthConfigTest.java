package com.rhc.pharmacyservice.config;

import feign.RequestTemplate;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

class FeignAuthConfigTest {
    private final FeignAuthConfig config = new FeignAuthConfig();

    @AfterEach
    void clearRequest() {
        RequestContextHolder.resetRequestAttributes();
    }

    @Test
    void forwardsPatientBearerTokenToPrescriptionService() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer patient-token");
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));

        RequestTemplate template = new RequestTemplate();
        config.bearerTokenForwarder().apply(template);

        assertEquals("Bearer patient-token", template.headers().get("Authorization").iterator().next());
    }

    @Test
    void doesNotForwardUntrustedAuthorizationScheme() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Basic credentials");
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));

        RequestTemplate template = new RequestTemplate();
        config.bearerTokenForwarder().apply(template);

        assertFalse(template.headers().containsKey("Authorization"));
    }
}
