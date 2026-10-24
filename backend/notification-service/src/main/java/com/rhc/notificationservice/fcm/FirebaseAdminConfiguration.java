package com.rhc.notificationservice.fcm;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.messaging.FirebaseMessaging;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.IOException;

@Configuration
@ConditionalOnProperty(name = "firebase.enabled", havingValue = "true")
public class FirebaseAdminConfiguration {
    @Bean
    @ConditionalOnMissingBean
    FirebaseApp firebaseApp(@Value("${firebase.project-id}") String projectId) throws IOException {
        if (projectId == null || projectId.isBlank()) {
            throw new IllegalStateException("FIREBASE_PROJECT_ID is required when FCM_ENABLED=true");
        }
        FirebaseOptions options = FirebaseOptions.builder()
                .setCredentials(GoogleCredentials.getApplicationDefault())
                .setProjectId(projectId)
                .build();
        return FirebaseApp.initializeApp(options);
    }

    @Bean
    @ConditionalOnMissingBean
    FcmSender firebaseFcmSender(FirebaseApp firebaseApp) {
        return new FirebaseAdminFcmSender(FirebaseMessaging.getInstance(firebaseApp));
    }
}
