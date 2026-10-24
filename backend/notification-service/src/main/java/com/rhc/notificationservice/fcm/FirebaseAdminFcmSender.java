package com.rhc.notificationservice.fcm;

import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.FirebaseMessagingException;
import com.google.firebase.messaging.Message;
import com.google.firebase.messaging.MessagingErrorCode;
import com.google.firebase.messaging.Notification;

import java.util.Map;

public class FirebaseAdminFcmSender implements FcmSender {
    private final FirebaseMessaging messaging;

    public FirebaseAdminFcmSender(FirebaseMessaging messaging) { this.messaging = messaging; }

    @Override
    public String send(String pushToken, String title, String body, Map<String, String> data) {
        Message message = Message.builder()
                .setToken(pushToken)
                .setNotification(Notification.builder().setTitle(title).setBody(body).build())
                .putAllData(data)
                .build();
        try {
            return messaging.send(message);
        } catch (FirebaseMessagingException error) {
            if (error.getMessagingErrorCode() == MessagingErrorCode.UNREGISTERED) {
                throw new InvalidPushTokenException("FCM token is no longer registered", error);
            }
            throw new IllegalStateException("Firebase Cloud Messaging rejected the message", error);
        }
    }
}
