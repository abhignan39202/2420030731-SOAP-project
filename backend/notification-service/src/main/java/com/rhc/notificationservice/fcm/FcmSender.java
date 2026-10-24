package com.rhc.notificationservice.fcm;

import java.util.Map;

public interface FcmSender {
    /** Returns Firebase's message identifier only when FCM accepted the message. */
    String send(String pushToken, String title, String body, Map<String, String> data);
}
