package com.rhc.notificationservice.controller;

import com.rhc.notificationservice.dto.NotificationResponse;
import com.rhc.notificationservice.security.AuthenticatedPrincipal;
import com.rhc.notificationservice.service.NotificationDispatchService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {
    private final NotificationDispatchService notifications;

    public NotificationController(NotificationDispatchService notifications) { this.notifications = notifications; }

    @GetMapping
    public List<NotificationResponse> list(@AuthenticationPrincipal AuthenticatedPrincipal principal) {
        return notifications.listForUser(principal.userId());
    }
}
