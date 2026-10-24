package com.rhc.consultationservice.config;

import com.rhc.consultationservice.websocket.ConsultationRoomWebSocketHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
@RequiredArgsConstructor
public class ConsultationWebSocketConfig implements WebSocketConfigurer {

    private final ConsultationRoomWebSocketHandler consultationRoomWebSocketHandler;

    @Value("${app.frontend-origin:http://localhost:3000}")
    private String frontendOrigin;

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(consultationRoomWebSocketHandler, "/ws/consultations")
                .setAllowedOrigins(frontendOrigin.split(","));
    }
}
