package com.rhc.consultationservice.websocket;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rhc.consultationservice.entity.Consultation;
import com.rhc.consultationservice.entity.ConsultationStatus;
import com.rhc.consultationservice.repository.ConsultationRepository;
import com.rhc.consultationservice.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.ConcurrentWebSocketSessionDecorator;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.TimeUnit;

/**
 * Authenticates each browser socket with its first JSON frame and relays only
 * SDP/ICE and room-state messages. WebRTC media never passes through this service.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ConsultationRoomWebSocketHandler extends TextWebSocketHandler {

    private static final String AUTHENTICATED = "rhc.authenticated";
    private static final String USER_ID = "rhc.userId";
    private static final String ROLES = "rhc.roles";
    private static final String SAFE_SESSION = "rhc.safeSession";
    private static final String CONSULTATION_ID = "rhc.consultationId";
    private static final Set<String> SIGNAL_TYPES = Set.of("offer", "answer", "ice-candidate");

    private final ObjectMapper objectMapper;
    private final JwtUtil jwtUtil;
    private final ConsultationRepository consultationRepository;

    private final ConcurrentMap<Long, ConcurrentMap<Long, RoomParticipant>> rooms = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        CompletableFuture.delayedExecutor(8, TimeUnit.SECONDS).execute(() -> {
            if (session.isOpen() && !Boolean.TRUE.equals(session.getAttributes().get(AUTHENTICATED))) {
                closeQuietly(session, CloseStatus.POLICY_VIOLATION);
            }
        });
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) {
        try {
            JsonNode body = objectMapper.readTree(message.getPayload());
            String type = body.path("type").asText("");

            if (!Boolean.TRUE.equals(session.getAttributes().get(AUTHENTICATED))) {
                if (!"AUTHENTICATE".equals(type)) {
                    reject(session, "AUTHENTICATION_REQUIRED", "Authenticate before sending room messages.");
                    return;
                }
                authenticate(session, body.path("token").asText(null));
                return;
            }

            switch (type) {
                case "JOIN" -> joinRoom(session, body.path("consultationId").asLong(0));
                case "LEAVE" -> leaveRoom(session);
                case "SIGNAL" -> relaySignal(session, body);
                case "MEDIA_STATE" -> updateMediaState(session, body);
                case "SYNC_STATE" -> broadcastCurrentConsultationState(session);
                default -> sendError(session, "INVALID_MESSAGE", "Unsupported consultation room message.");
            }
        } catch (Exception exception) {
            log.debug("Rejected invalid consultation WebSocket message: {}", exception.getMessage());
            sendError(session, "INVALID_MESSAGE", "The room message could not be processed.");
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        leaveRoom(session);
    }

    private void authenticate(WebSocketSession session, String token) {
        if (token == null || token.isBlank() || !jwtUtil.validateToken(token)) {
            reject(session, "INVALID_TOKEN", "A valid sign-in token is required.");
            return;
        }

        Long userId = jwtUtil.extractUserId(token);
        Collection<String> tokenRoles = jwtUtil.extractRoles(token);
        if (userId == null || tokenRoles == null || tokenRoles.isEmpty()) {
            reject(session, "INVALID_TOKEN", "The sign-in token is missing user identity or roles.");
            return;
        }

        Set<String> roles = tokenRoles.stream()
                .filter(role -> role != null && !role.isBlank())
                .map(role -> role.replaceFirst("^ROLE_", "").toUpperCase(Locale.ROOT))
                .collect(java.util.stream.Collectors.toUnmodifiableSet());
        if (!roles.contains("PATIENT") && !roles.contains("DOCTOR")) {
            reject(session, "ROOM_ROLE_REQUIRED", "Only the patient and assigned doctor can join this room.");
            return;
        }

        session.getAttributes().put(USER_ID, userId);
        session.getAttributes().put(ROLES, roles);
        session.getAttributes().put(SAFE_SESSION,
                new ConcurrentWebSocketSessionDecorator(session, 10_000, 64 * 1024));
        session.getAttributes().put(AUTHENTICATED, true);
        send(sessionFor(session), event("AUTHENTICATED", "userId", userId));
    }

    private void joinRoom(WebSocketSession session, long consultationId) {
        if (consultationId <= 0 || session.getAttributes().containsKey(CONSULTATION_ID)) {
            sendError(session, "INVALID_ROOM", "Join one valid consultation room at a time.");
            return;
        }

        Consultation consultation = consultationRepository.findById(consultationId).orElse(null);
        if (consultation == null) {
            sendError(session, "ROOM_NOT_FOUND", "Consultation room was not found.");
            return;
        }

        String role = participantRole(session, consultation);
        if (role == null) {
            reject(session, "ROOM_ACCESS_DENIED", "You are not the patient or assigned doctor for this consultation.");
            return;
        }
        if (consultation.getStatus() == ConsultationStatus.COMPLETED
                || consultation.getStatus() == ConsultationStatus.CANCELLED) {
            sendError(session, "ROOM_CLOSED", "This consultation is no longer open for video.");
            return;
        }

        Long userId = userId(session);
        ConcurrentMap<Long, RoomParticipant> room = rooms.computeIfAbsent(consultationId, ignored -> new ConcurrentHashMap<>());
        RoomParticipant participant = new RoomParticipant(userId, role, sessionFor(session));
        if (room.putIfAbsent(userId, participant) != null) {
            sendError(session, "ALREADY_JOINED", "This user is already connected to the consultation room.");
            return;
        }

        session.getAttributes().put(CONSULTATION_ID, consultationId);
        List<Map<String, Object>> others = room.values().stream()
                .filter(member -> !member.userId().equals(userId))
                .map(RoomParticipant::toView)
                .toList();
        Map<String, Object> joined = event("JOINED", "consultationId", consultationId);
        joined.put("role", role);
        joined.put("consultationStatus", consultation.getStatus().name());
        joined.put("participants", others);
        send(sessionFor(session), joined);

        Map<String, Object> participantJoined = event("PARTICIPANT_JOINED", "participant", participant.toView());
        participantJoined.put("consultationStatus", consultation.getStatus().name());
        broadcast(room, userId, participantJoined);
    }

    private void relaySignal(WebSocketSession session, JsonNode body) {
        Long consultationId = roomId(session);
        Long senderId = userId(session);
        if (consultationId == null || senderId == null) {
            sendError(session, "NOT_IN_ROOM", "Join the consultation before sending signaling data.");
            return;
        }
        Consultation consultation = consultationRepository.findById(consultationId).orElse(null);
        if (consultation == null || isTerminal(consultation)) {
            if (consultation != null) broadcastConsultationState(consultationId, consultation);
            sendError(session, "ROOM_CLOSED", "This consultation no longer accepts signaling messages.");
            return;
        }

        String signalType = body.path("signalType").asText("");
        long targetId = body.path("targetUserId").asLong(0);
        JsonNode payload = body.get("payload");
        if (!SIGNAL_TYPES.contains(signalType) || targetId <= 0 || targetId == senderId || payload == null || payload.isNull()) {
            sendError(session, "INVALID_SIGNAL", "The WebRTC signaling message is incomplete.");
            return;
        }

        ConcurrentMap<Long, RoomParticipant> room = rooms.get(consultationId);
        RoomParticipant target = room == null ? null : room.get(targetId);
        if (target == null) {
            sendError(session, "PEER_NOT_IN_ROOM", "The other consultation participant is not connected.");
            return;
        }

        Map<String, Object> signal = event("SIGNAL", "consultationId", consultationId);
        signal.put("fromUserId", senderId);
        signal.put("signalType", signalType);
        signal.put("payload", payload);
        send(target.session(), signal);
    }

    private void updateMediaState(WebSocketSession session, JsonNode body) {
        Long consultationId = roomId(session);
        Long userId = userId(session);
        ConcurrentMap<Long, RoomParticipant> room = consultationId == null ? null : rooms.get(consultationId);
        RoomParticipant participant = room == null || userId == null ? null : room.get(userId);
        if (participant == null) {
            sendError(session, "NOT_IN_ROOM", "Join the consultation before updating camera or microphone state.");
            return;
        }
        Consultation consultation = consultationRepository.findById(consultationId).orElse(null);
        if (consultation == null || isTerminal(consultation)) {
            if (consultation != null) broadcastConsultationState(consultationId, consultation);
            sendError(session, "ROOM_CLOSED", "This consultation no longer accepts room updates.");
            return;
        }
        if (!body.path("cameraEnabled").isBoolean() || !body.path("microphoneEnabled").isBoolean()) {
            sendError(session, "INVALID_MEDIA_STATE", "Camera and microphone states must be boolean values.");
            return;
        }

        participant.setMediaState(body.path("cameraEnabled").booleanValue(), body.path("microphoneEnabled").booleanValue());
        broadcast(room, userId, event("MEDIA_STATE", "participant", participant.toView()));
    }

    private void broadcastCurrentConsultationState(WebSocketSession session) {
        Long consultationId = roomId(session);
        if (consultationId == null) {
            sendError(session, "NOT_IN_ROOM", "Join the consultation before requesting room state.");
            return;
        }
        Consultation consultation = consultationRepository.findById(consultationId).orElse(null);
        if (consultation == null) {
            sendError(session, "ROOM_NOT_FOUND", "Consultation room was not found.");
            return;
        }

        broadcastConsultationState(consultationId, consultation);
    }

    private void broadcastConsultationState(Long consultationId, Consultation consultation) {
        Map<String, Object> state = event("ROOM_STATE", "consultationId", consultationId);
        state.put("consultationStatus", consultation.getStatus().name());
        state.put("startedAt", consultation.getStartedAt());
        state.put("completedAt", consultation.getCompletedAt());
        ConcurrentMap<Long, RoomParticipant> room = rooms.get(consultationId);
        if (room != null) broadcast(room, null, state);
    }

    private boolean isTerminal(Consultation consultation) {
        return consultation.getStatus() == ConsultationStatus.COMPLETED
                || consultation.getStatus() == ConsultationStatus.CANCELLED;
    }

    private void leaveRoom(WebSocketSession session) {
        Long consultationId = roomId(session);
        Long userId = userId(session);
        if (consultationId == null || userId == null) return;

        ConcurrentMap<Long, RoomParticipant> room = rooms.get(consultationId);
        if (room != null) {
            RoomParticipant participant = room.get(userId);
            if (participant != null && participant.session().getId().equals(sessionFor(session).getId())) {
                room.remove(userId, participant);
                broadcast(room, null, event("PARTICIPANT_LEFT", "userId", userId));
                if (room.isEmpty()) rooms.remove(consultationId, room);
            }
        }
        session.getAttributes().remove(CONSULTATION_ID);
    }

    private String participantRole(WebSocketSession session, Consultation consultation) {
        Object rawRoles = session.getAttributes().get(ROLES);
        if (!(rawRoles instanceof Set<?> roles)) return null;
        Long userId = userId(session);
        if (userId == null) return null;
        boolean doctor = roles.contains("DOCTOR") && consultation.getDoctorId().equals(userId);
        if (doctor) return "DOCTOR";
        boolean patient = roles.contains("PATIENT") && consultation.getPatientId().equals(userId);
        return patient ? "PATIENT" : null;
    }

    private void broadcast(ConcurrentMap<Long, RoomParticipant> room, Long excludedUserId, Map<String, Object> message) {
        room.values().stream()
                .filter(member -> excludedUserId == null || !member.userId().equals(excludedUserId))
                .forEach(member -> send(member.session(), message));
    }

    private WebSocketSession sessionFor(WebSocketSession session) {
        Object safeSession = session.getAttributes().get(SAFE_SESSION);
        return safeSession instanceof WebSocketSession decorated ? decorated : session;
    }

    private Long roomId(WebSocketSession session) {
        Object value = session.getAttributes().get(CONSULTATION_ID);
        return value instanceof Number number ? number.longValue() : null;
    }

    private Long userId(WebSocketSession session) {
        Object value = session.getAttributes().get(USER_ID);
        return value instanceof Number number ? number.longValue() : null;
    }

    private void reject(WebSocketSession session, String code, String message) {
        sendError(session, code, message);
        closeQuietly(sessionFor(session), CloseStatus.POLICY_VIOLATION);
    }

    private void sendError(WebSocketSession session, String code, String message) {
        Map<String, Object> error = event("ERROR", "code", code);
        error.put("message", message);
        send(sessionFor(session), error);
    }

    private void send(WebSocketSession session, Map<String, Object> message) {
        if (!session.isOpen()) return;
        try {
            session.sendMessage(new TextMessage(objectMapper.writeValueAsString(message)));
        } catch (IOException exception) {
            log.debug("Unable to send consultation room event to session {}: {}", session.getId(), exception.getMessage());
            closeQuietly(session, CloseStatus.SERVER_ERROR);
        }
    }

    private void closeQuietly(WebSocketSession session, CloseStatus status) {
        try {
            if (session.isOpen()) session.close(status);
        } catch (IOException ignored) {
            // The connection may already have closed while a peer event was being delivered.
        }
    }

    private Map<String, Object> event(String type, String key, Object value) {
        Map<String, Object> event = new LinkedHashMap<>();
        event.put("type", type);
        event.put(key, value);
        return event;
    }

    private static final class RoomParticipant {
        private final Long userId;
        private final String role;
        private final WebSocketSession session;
        private volatile boolean cameraEnabled = true;
        private volatile boolean microphoneEnabled = true;

        private RoomParticipant(Long userId, String role, WebSocketSession session) {
            this.userId = userId;
            this.role = role;
            this.session = session;
        }

        private Long userId() { return userId; }
        private String role() { return role; }
        private WebSocketSession session() { return session; }

        private void setMediaState(boolean cameraEnabled, boolean microphoneEnabled) {
            this.cameraEnabled = cameraEnabled;
            this.microphoneEnabled = microphoneEnabled;
        }

        private Map<String, Object> toView() {
            Map<String, Object> view = new LinkedHashMap<>();
            view.put("userId", userId);
            view.put("role", role);
            view.put("cameraEnabled", cameraEnabled);
            view.put("microphoneEnabled", microphoneEnabled);
            return view;
        }
    }
}
