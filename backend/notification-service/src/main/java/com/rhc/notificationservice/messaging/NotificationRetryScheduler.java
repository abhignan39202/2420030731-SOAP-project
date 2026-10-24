package com.rhc.notificationservice.messaging;

import com.rhc.notificationservice.service.NotificationDispatchService;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "notification.scheduler.enabled", havingValue = "true", matchIfMissing = true)
public class NotificationRetryScheduler {
    private final NotificationDispatchService dispatchService;

    public NotificationRetryScheduler(NotificationDispatchService dispatchService) { this.dispatchService = dispatchService; }

    @Scheduled(fixedDelayString = "${notification.retry-interval-ms:30000}")
    public void processDueNotifications() { dispatchService.dispatchPending(); }
}
