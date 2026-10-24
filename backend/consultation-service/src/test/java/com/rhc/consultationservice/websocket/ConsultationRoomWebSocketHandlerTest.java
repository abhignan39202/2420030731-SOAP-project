package com.rhc.consultationservice.websocket;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rhc.consultationservice.entity.Consultation;
import com.rhc.consultationservice.entity.ConsultationStatus;
import com.rhc.consultationservice.repository.ConsultationRepository;
import com.rhc.consultationservice.security.JwtUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketMessage;
import org.springframework.web.socket.WebSocketSession;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CopyOnWriteArrayList;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ConsultationRoomWebSocketHandlerTest {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final JwtUtil jwtUtil = mock(JwtUtil.class);
    private final ConsultationRepository consultationRepository = mock(ConsultationRepository.class);
    private ConsultationRoomWebSocketHandler handler;
    private Consultation consultation;

    @BeforeEach
    void setUp() {
        handler = new ConsultationRoomWebSocketHandler(objectMapper, jwtUtil, consultationRepository);
        consultation = Consultation.builder()
                .id(42L)
                .appointmentId(12L)
                .patientId(100L)
                .doctorId(7L)
                .status(ConsultationStatus.SCHEDULED)
                .build();
        when(consultationRepository.findById(42L)).thenReturn(Optional.of(consultation));
    }

    @Test
    void onlyPatientAndAssignedDoctorCanJoinAndExchangeWebRtcSignal() throws Exception {
        stubToken("patient-token", 100L, "PATIENT");
        stubToken("doctor-token", 7L, "DOCTOR");
        RecordingSession patient = newSession("patient-session");
        RecordingSession doctor = newSession("doctor-session");

        connectAndAuthenticate(patient, "patient-token");
        send(patient, "{\"type\":\"JOIN\",\"consultationId\":42}");
        assertTrue(patient.messages().stream().anyMatch(frame -> frame.contains("\"type\":\"JOINED\"")));
        assertTrue(patient.messages().stream().anyMatch(frame -> frame.contains("\"consultationStatus\":\"SCHEDULED\"")));

        connectAndAuthenticate(doctor, "doctor-token");
        send(doctor, "{\"type\":\"JOIN\",\"consultationId\":42}");
        assertTrue(patient.messages().stream().anyMatch(frame -> frame.contains("\"type\":\"PARTICIPANT_JOINED\"")));
        assertTrue(doctor.messages().stream().anyMatch(frame -> frame.contains("\"role\":\"DOCTOR\"")));

        send(doctor, "{\"type\":\"SIGNAL\",\"targetUserId\":100,\"signalType\":\"offer\",\"payload\":{\"type\":\"offer\",\"sdp\":\"test-sdp\"}}");
        assertTrue(patient.messages().stream().anyMatch(frame ->
                frame.contains("\"type\":\"SIGNAL\"") && frame.contains("\"signalType\":\"offer\"")
                        && frame.contains("\"fromUserId\":7")));

        consultation.setStatus(ConsultationStatus.IN_PROGRESS);
        send(doctor, "{\"type\":\"SYNC_STATE\"}");
        assertTrue(patient.messages().stream().anyMatch(frame ->
                frame.contains("\"type\":\"ROOM_STATE\"") && frame.contains("\"consultationStatus\":\"IN_PROGRESS\"")));

        long relayedOffersBeforeCompletion = patient.messages().stream()
                .filter(frame -> frame.contains("\"type\":\"SIGNAL\"") && frame.contains("\"signalType\":\"offer\""))
                .count();
        consultation.setStatus(ConsultationStatus.COMPLETED);
        send(doctor, "{\"type\":\"SYNC_STATE\"}");
        send(doctor, "{\"type\":\"SIGNAL\",\"targetUserId\":100,\"signalType\":\"offer\",\"payload\":{\"type\":\"offer\",\"sdp\":\"late-offer\"}}");
        assertTrue(patient.messages().stream().anyMatch(frame -> frame.contains("\"consultationStatus\":\"COMPLETED\"")));
        assertTrue(patient.messages().stream()
                .filter(frame -> frame.contains("\"type\":\"SIGNAL\"") && frame.contains("\"signalType\":\"offer\""))
                .count() == relayedOffersBeforeCompletion);
        assertTrue(doctor.messages().stream().anyMatch(frame -> frame.contains("\"code\":\"ROOM_CLOSED\"")));
    }

    @Test
    void rejectsInvalidJwtBeforeJoiningRoom() throws Exception {
        when(jwtUtil.validateToken("invalid-token")).thenReturn(false);
        RecordingSession socket = newSession("unauthenticated-session");
        handler.afterConnectionEstablished(socket.session());

        send(socket, "{\"type\":\"AUTHENTICATE\",\"token\":\"invalid-token\"}");

        assertTrue(socket.messages().stream().anyMatch(frame -> frame.contains("\"code\":\"INVALID_TOKEN\"")));
        verify(socket.session()).close(CloseStatus.POLICY_VIOLATION);
    }

    @Test
    void rejectsPatientWhoIsNotAssignedToTheConsultation() throws Exception {
        stubToken("other-patient-token", 999L, "PATIENT");
        RecordingSession socket = newSession("other-patient-session");
        connectAndAuthenticate(socket, "other-patient-token");

        send(socket, "{\"type\":\"JOIN\",\"consultationId\":42}");

        assertTrue(socket.messages().stream().anyMatch(frame -> frame.contains("\"code\":\"ROOM_ACCESS_DENIED\"")));
        verify(socket.session()).close(CloseStatus.POLICY_VIOLATION);
    }

    private void stubToken(String token, Long userId, String role) {
        when(jwtUtil.validateToken(token)).thenReturn(true);
        when(jwtUtil.extractUserId(token)).thenReturn(userId);
        when(jwtUtil.extractRoles(token)).thenReturn(List.of(role));
    }

    private void connectAndAuthenticate(RecordingSession recordingSession, String token) throws Exception {
        handler.afterConnectionEstablished(recordingSession.session());
        send(recordingSession, "{\"type\":\"AUTHENTICATE\",\"token\":\"" + token + "\"}");
    }

    private void send(RecordingSession session, String frame) throws Exception {
        handler.handleTextMessage(session.session(), new TextMessage(frame));
    }

    private RecordingSession newSession(String id) throws Exception {
        WebSocketSession session = mock(WebSocketSession.class);
        Map<String, Object> attributes = new HashMap<>();
        List<String> sentMessages = new CopyOnWriteArrayList<>();
        when(session.getId()).thenReturn(id);
        when(session.getAttributes()).thenReturn(attributes);
        when(session.isOpen()).thenReturn(true);
        doAnswer(invocation -> {
            WebSocketMessage<?> message = invocation.getArgument(0);
            sentMessages.add(String.valueOf(message.getPayload()));
            return null;
        }).when(session).sendMessage(any(WebSocketMessage.class));
        return new RecordingSession(session, sentMessages);
    }

    private record RecordingSession(WebSocketSession session, List<String> messages) {}
}
