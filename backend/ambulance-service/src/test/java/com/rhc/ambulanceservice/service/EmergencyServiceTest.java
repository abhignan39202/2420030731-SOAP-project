package com.rhc.ambulanceservice.service;

import com.rhc.ambulanceservice.dto.EmergencyCreateRequest;
import com.rhc.ambulanceservice.dto.EmergencyResponse;
import com.rhc.ambulanceservice.entity.*;
import com.rhc.ambulanceservice.exception.*;
import com.rhc.ambulanceservice.repository.*;
import com.rhc.notificationcontract.NotificationEvent;
import com.rhc.notificationcontract.NotificationEventPublisher;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.ArgumentCaptor;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class EmergencyServiceTest {

    @Mock
    private EmergencyRequestRepository emergencyRequestRepository;

    @Mock
    private AmbulanceRepository ambulanceRepository;

    @Mock
    private AmbulanceOperatorRepository operatorRepository;

    @Mock
    private EmergencyAssignmentRepository assignmentRepository;

    @Mock
    private NotificationEventPublisher notificationEventPublisher;

    @InjectMocks
    private EmergencyService emergencyService;

    private AmbulanceOperator activeOperator;
    private Ambulance availableAmbulance;
    private EmergencyCreateRequest request;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(emergencyService, "notificationEventPublisher", notificationEventPublisher);
        activeOperator = AmbulanceOperator.builder()
                .id(1L)
                .userId(300L)
                .name("Ramesh Operator")
                .phone("+91 9876543210")
                .status(OperatorStatus.AVAILABLE)
                .build();

        availableAmbulance = Ambulance.builder()
                .id(10L)
                .registrationNumber("AP-04-AM-1008")
                .vehicleType("ADVANCED")
                .status(AmbulanceStatus.AVAILABLE)
                .latitude(17.3850)
                .longitude(78.4867)
                .operator(activeOperator)
                .build();

        request = EmergencyCreateRequest.builder()
                .pickupAddress("Village Main Road")
                .pickupLatitude(17.3850)
                .pickupLongitude(78.4867)
                .emergencyDescription("Chest pain reported")
                .hospitalName("District General Hospital")
                .hospitalAddress("Hospital Road")
                .build();
    }

    // 1. Create emergency request & assign nearest ambulance
    @Test
    void testCreateEmergencyRequestSuccess() {
        when(emergencyRequestRepository.findActiveByPatientId(eq(100L), anyList())).thenReturn(Collections.emptyList());
        when(emergencyRequestRepository.save(any(EmergencyRequest.class))).thenAnswer(i -> {
            EmergencyRequest req = i.getArgument(0);
            if (req.getId() == null) req.setId(1000L);
            return req;
        });
        when(ambulanceRepository.findAvailableWithLock(AmbulanceStatus.AVAILABLE)).thenReturn(List.of(availableAmbulance));
        when(ambulanceRepository.reserveIfAvailable(10L, AmbulanceStatus.AVAILABLE, AmbulanceStatus.ASSIGNED)).thenReturn(1);
        when(assignmentRepository.save(any(EmergencyAssignment.class))).thenAnswer(i -> {
            EmergencyAssignment assignment = i.getArgument(0);
            assignment.setId(2000L);
            return assignment;
        });

        EmergencyResponse response = emergencyService.createEmergencyRequest(100L, request);

        assertNotNull(response);
        assertEquals(1000L, response.getId());
        assertEquals(EmergencyStatus.ASSIGNED, response.getStatus());
        assertEquals(10L, response.getAmbulanceId());
        assertEquals(2000L, response.getAssignmentId());
        assertEquals(0.0, response.getDistanceKm());
        assertEquals("AP-04-AM-1008", response.getAssignedAmbulance().getRegistrationNumber());
        assertEquals(AmbulanceStatus.ASSIGNED, availableAmbulance.getStatus());
        assertEquals(OperatorStatus.ASSIGNED, activeOperator.getStatus());

        ArgumentCaptor<NotificationEvent> events = ArgumentCaptor.forClass(NotificationEvent.class);
        verify(notificationEventPublisher, times(2)).publish(events.capture());
        assertEquals(List.of(100L, 300L), events.getAllValues().stream().map(NotificationEvent::userId).toList());
        assertTrue(events.getAllValues().stream().allMatch(event -> event.eventType().equals("AMBULANCE_ASSIGNED")));
        assertTrue(events.getAllValues().stream().allMatch(event ->
                "10".equals(event.data().get("ambulanceId"))
                        && "2000".equals(event.data().get("assignmentId"))
                        && "0.0".equals(event.data().get("distanceKm"))
                        && "ASSIGNED".equals(event.data().get("status"))));
    }

    @Test
    void testDoesNotAssignAmbulanceWithUnavailableOperator() {
        activeOperator.setStatus(OperatorStatus.ASSIGNED);
        when(emergencyRequestRepository.findActiveByPatientId(eq(100L), anyList())).thenReturn(Collections.emptyList());
        when(emergencyRequestRepository.save(any(EmergencyRequest.class))).thenAnswer(i -> {
            EmergencyRequest req = i.getArgument(0);
            if (req.getId() == null) req.setId(1001L);
            return req;
        });
        when(ambulanceRepository.findAvailableWithLock(AmbulanceStatus.AVAILABLE)).thenReturn(List.of(availableAmbulance));

        EmergencyResponse response = emergencyService.createEmergencyRequest(100L, request);

        assertEquals(EmergencyStatus.REQUESTED, response.getStatus());
        assertNull(response.getAssignedAmbulance());
        assertNull(response.getAssignedOperator());
        verify(assignmentRepository, never()).save(any());
        verify(notificationEventPublisher, never()).publish(any());
    }

    // 2. Reject duplicate active emergency for same patient
    @Test
    void testRejectDuplicateActiveEmergency() {
        EmergencyRequest existing = EmergencyRequest.builder().id(500L).patientId(100L).status(EmergencyStatus.EN_ROUTE).build();
        when(emergencyRequestRepository.findActiveByPatientId(eq(100L), anyList())).thenReturn(List.of(existing));

        assertThrows(DuplicateActiveEmergencyException.class, () ->
            emergencyService.createEmergencyRequest(100L, request)
        );
    }

    // 3. Complete emergency lifecycle: ASSIGNED -> EN_ROUTE -> ARRIVED -> PATIENT_PICKED -> HOSPITAL_REACHED -> COMPLETED
    @Test
    void testEmergencyFullLifecycle() {
        EmergencyRequest activeEmergency = EmergencyRequest.builder()
                .id(1000L)
                .patientId(100L)
                .status(EmergencyStatus.ASSIGNED)
                .assignedAmbulance(availableAmbulance)
                .assignedOperator(activeOperator)
                .build();

        when(emergencyRequestRepository.findById(1000L)).thenReturn(Optional.of(activeEmergency));
        when(emergencyRequestRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        // ASSIGNED -> EN_ROUTE
        EmergencyResponse r1 = emergencyService.advanceEmergencyStatus(1000L, 300L);
        assertEquals(EmergencyStatus.EN_ROUTE, r1.getStatus());
        assertEquals(AmbulanceStatus.EN_ROUTE, availableAmbulance.getStatus());

        // EN_ROUTE -> ARRIVED
        EmergencyResponse r2 = emergencyService.advanceEmergencyStatus(1000L, 300L);
        assertEquals(EmergencyStatus.ARRIVED, r2.getStatus());
        assertEquals(AmbulanceStatus.ON_SCENE, availableAmbulance.getStatus());

        // ARRIVED -> PATIENT_PICKED
        EmergencyResponse r3 = emergencyService.advanceEmergencyStatus(1000L, 300L);
        assertEquals(EmergencyStatus.PATIENT_PICKED, r3.getStatus());
        assertEquals(AmbulanceStatus.PATIENT_TRANSPORTING, availableAmbulance.getStatus());

        // PATIENT_PICKED -> HOSPITAL_REACHED
        EmergencyResponse r4 = emergencyService.advanceEmergencyStatus(1000L, 300L);
        assertEquals(EmergencyStatus.HOSPITAL_REACHED, r4.getStatus());

        // HOSPITAL_REACHED -> COMPLETED
        EmergencyResponse r5 = emergencyService.advanceEmergencyStatus(1000L, 300L);
        assertEquals(EmergencyStatus.COMPLETED, r5.getStatus());
        assertEquals(AmbulanceStatus.AVAILABLE, availableAmbulance.getStatus());
        assertEquals(OperatorStatus.AVAILABLE, activeOperator.getStatus());
    }

    // 4. Reject unauthorized operator update
    @Test
    void testRejectUnauthorizedOperatorUpdate() {
        EmergencyRequest activeEmergency = EmergencyRequest.builder()
                .id(1000L)
                .status(EmergencyStatus.ASSIGNED)
                .assignedOperator(activeOperator)
                .build();

        when(emergencyRequestRepository.findById(1000L)).thenReturn(Optional.of(activeEmergency));

        assertThrows(UnauthorizedException.class, () ->
            emergencyService.advanceEmergencyStatus(1000L, 999L) // Wrong operator userId
        );
    }

    // 5. Reject invalid status transition (e.g. ASSIGNED -> COMPLETED directly)
    @Test
    void testRejectInvalidStatusTransition() {
        EmergencyRequest activeEmergency = EmergencyRequest.builder()
                .id(1000L)
                .status(EmergencyStatus.REQUESTED)
                .assignedOperator(activeOperator)
                .build();

        when(emergencyRequestRepository.findById(1000L)).thenReturn(Optional.of(activeEmergency));

        assertThrows(InvalidStatusTransitionException.class, () ->
            emergencyService.advanceEmergencyStatus(1000L, 300L)
        );
    }

    // 6. Test Haversine distance calculation
    @Test
    void testHaversineDistance() {
        // Distance between Hyderabad (17.3850, 78.4867) and Secunderabad (17.4399, 78.4983) is approx 6.2 km
        double distance = EmergencyService.haversineDistance(17.3850, 78.4867, 17.4399, 78.4983);
        assertTrue(distance > 5.0 && distance < 7.5, "Expected distance around 6.2 km but got: " + distance);
    }

    @Test
    void testDoesNotAssignAmbulanceWithoutValidCoordinates() {
        availableAmbulance.setLatitude(null);
        when(emergencyRequestRepository.findActiveByPatientId(eq(100L), anyList())).thenReturn(Collections.emptyList());
        when(emergencyRequestRepository.save(any(EmergencyRequest.class))).thenAnswer(i -> {
            EmergencyRequest req = i.getArgument(0);
            if (req.getId() == null) req.setId(1002L);
            return req;
        });
        when(ambulanceRepository.findAvailableWithLock(AmbulanceStatus.AVAILABLE)).thenReturn(List.of(availableAmbulance));

        EmergencyResponse response = emergencyService.createEmergencyRequest(100L, request);

        assertEquals(EmergencyStatus.REQUESTED, response.getStatus());
        assertNull(response.getAmbulanceId());
        assertNull(response.getAssignmentId());
        assertNull(response.getDistanceKm());
        verify(ambulanceRepository, never()).reserveIfAvailable(any(), any(), any());
    }

    @Test
    void testChoosesNearestAvailableAmbulance() {
        AmbulanceOperator fartherOperator = AmbulanceOperator.builder()
                .id(2L).userId(301L).name("Farther Operator").status(OperatorStatus.AVAILABLE).build();
        Ambulance fartherAmbulance = Ambulance.builder()
                .id(11L)
                .registrationNumber("AP-04-AM-1010")
                .vehicleType("BASIC")
                .status(AmbulanceStatus.AVAILABLE)
                .latitude(18.0)
                .longitude(79.0)
                .operator(fartherOperator)
                .build();
        when(emergencyRequestRepository.findActiveByPatientId(eq(100L), anyList())).thenReturn(Collections.emptyList());
        when(emergencyRequestRepository.save(any(EmergencyRequest.class))).thenAnswer(i -> {
            EmergencyRequest req = i.getArgument(0);
            if (req.getId() == null) req.setId(1003L);
            return req;
        });
        when(ambulanceRepository.findAvailableWithLock(AmbulanceStatus.AVAILABLE))
                .thenReturn(List.of(fartherAmbulance, availableAmbulance));
        when(ambulanceRepository.reserveIfAvailable(10L, AmbulanceStatus.AVAILABLE, AmbulanceStatus.ASSIGNED)).thenReturn(1);
        when(assignmentRepository.save(any(EmergencyAssignment.class))).thenAnswer(i -> {
            EmergencyAssignment assignment = i.getArgument(0);
            assignment.setId(2001L);
            return assignment;
        });

        EmergencyResponse response = emergencyService.createEmergencyRequest(100L, request);

        assertEquals(10L, response.getAmbulanceId());
        assertEquals(2001L, response.getAssignmentId());
        assertEquals(0.0, response.getDistanceKm());
        verify(ambulanceRepository).reserveIfAvailable(10L, AmbulanceStatus.AVAILABLE, AmbulanceStatus.ASSIGNED);
        verify(ambulanceRepository, never()).reserveIfAvailable(11L, AmbulanceStatus.AVAILABLE, AmbulanceStatus.ASSIGNED);
    }

    // 7. Test patient cancellation releases ambulance
    @Test
    void testCancelEmergencyReleasesAmbulance() {
        EmergencyRequest activeEmergency = EmergencyRequest.builder()
                .id(1000L)
                .patientId(100L)
                .status(EmergencyStatus.ASSIGNED)
                .assignedAmbulance(availableAmbulance)
                .assignedOperator(activeOperator)
                .build();

        when(emergencyRequestRepository.findById(1000L)).thenReturn(Optional.of(activeEmergency));
        when(emergencyRequestRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        EmergencyResponse cancelled = emergencyService.cancelEmergency(1000L, 100L);

        assertEquals(EmergencyStatus.CANCELLED, cancelled.getStatus());
        assertEquals(AmbulanceStatus.AVAILABLE, availableAmbulance.getStatus());
        assertEquals(OperatorStatus.AVAILABLE, activeOperator.getStatus());
    }
}
