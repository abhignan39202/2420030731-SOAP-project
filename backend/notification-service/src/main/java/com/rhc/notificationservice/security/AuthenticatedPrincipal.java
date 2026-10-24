package com.rhc.notificationservice.security;

public record AuthenticatedPrincipal(String username, Long userId) { }
