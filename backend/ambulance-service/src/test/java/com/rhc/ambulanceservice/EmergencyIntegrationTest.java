package com.rhc.ambulanceservice;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rhc.ambulanceservice.dto.EmergencyCreateRequest;
import com.rhc.ambulanceservice.dto.EmergencyResponse;
import com.rhc.ambulanceservice.entity.*;
import com.rhc.ambulanceservice.repository.AmbulanceOperatorRepository;
import com.rhc.ambulanceservice.repository.AmbulanceRepository;
import com.rhc.ambulanceservice.repository.EmergencyAssignmentRepository;
import com.rhc.ambulanceservice.repository.EmergencyRequestRepository;
import com.rhc.ambulanceservice.service.EmergencyService;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.LocalDateTime;
import java.time.Instant;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.concurrent.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class EmergencyIntegrationTest {

    private static final String JWT_SECRET = "404E635266556A586E3272357538782F413F4528462B4B6250645367566B5970";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private AmbulanceRepository ambulanceRepository;

    @Autowired
    private AmbulanceOperatorRepository operatorRepository;

    @Autowired
    private EmergencyRequestRepository emergencyRequestRepository;

    @Autowired
    private EmergencyService emergencyService;

    @Autowired
    private EmergencyAssignmentRepository assignmentRepository;

    private EmergencyCreateRequest request;

    @BeforeEach
    void setUp() {
        assignmentRepository.deleteAll();
        emergencyRequestRepository.deleteAll();
        ambulanceRepository.deleteAll();
        operatorRepository.deleteAll();

        // Seed single operator & ambulance for testing
        AmbulanceOperator operator = AmbulanceOperator.builder()
                .userId(300L)
                .name("Demo Operator")
                .phone("+91 9999999999")
                .status(OperatorStatus.AVAILABLE)
                .build();
        AmbulanceOperator savedOp = operatorRepository.save(operator);

        Ambulance ambulance = Ambulance.builder()
                .registrationNumber("AP-04-AM-1008")
                .vehicleType("ADVANCED")
                .status(AmbulanceStatus.AVAILABLE)
                .latitude(17.3850)
                .longitude(78.4867)
                .lastLocationUpdate(LocalDateTime.now())
                .operator(savedOp)
                .build();
        ambulanceRepository.save(ambulance);

        request = EmergencyCreateRequest.builder()
                .pickupAddress("Village Center")
                .pickupLatitude(17.3850)
                .pickupLongitude(78.4867)
                .emergencyDescription("Severe injury")
                .hospitalName("City Hospital")
                .hospitalAddress("Hospital Lane")
                .build();
    }

    // 1. Mandatory End-To-End Emergency Workflow Test
    @Test
    void testEndToEndEmergencyWorkflow() throws Exception {
        String patientToken = bearerToken(100L, "PATIENT");
        String operatorToken = bearerToken(300L, "AMBULANCE_OPERATOR");

        // Identity comes from the signed token; the spoofed header must not change the owner.
        MvcResult result = mockMvc.perform(post("/api/emergency/request")
                .header("Authorization", "Bearer " + patientToken)
                .header("X-User-Id", "999")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("ASSIGNED"))
                .andExpect(jsonPath("$.patientId").value(100))
                .andExpect(jsonPath("$.pickupLatitude").value(17.385))
                .andExpect(jsonPath("$.ambulanceId").isNumber())
                .andExpect(jsonPath("$.assignmentId").isNumber())
                .andExpect(jsonPath("$.distanceKm").value(0.0))
                .andExpect(jsonPath("$.assignedAmbulance.registrationNumber").value("AP-04-AM-1008"))
                .andReturn();

        var createdResponse = objectMapper.readTree(result.getResponse().getContentAsString());
        Long emergencyId = createdResponse.get("id").asLong();
        Long ambulanceId = createdResponse.get("ambulanceId").asLong();
        Long assignmentId = createdResponse.get("assignmentId").asLong();
        EmergencyRequest persisted = emergencyRequestRepository.findById(emergencyId).orElseThrow();
        assertEquals(100L, persisted.getPatientId());
        assertEquals(EmergencyStatus.ASSIGNED, persisted.getStatus());
        assertEquals(17.385, persisted.getPickupLatitude());
        assertEquals(78.4867, persisted.getPickupLongitude());
        assertNotNull(persisted.getAssignedAmbulance());
        assertEquals(300L, persisted.getAssignedOperator().getUserId());
        EmergencyAssignment savedAssignment = assignmentRepository.findByEmergencyRequestId(emergencyId).orElseThrow();
        assertEquals(persisted.getAssignedAmbulance().getId(), savedAssignment.getAmbulance().getId());
        assertEquals(0.0, savedAssignment.getDistanceKm());

        mockMvc.perform(get("/api/ambulances/" + ambulanceId)
                        .header("Authorization", "Bearer " + patientToken))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/ambulances/" + ambulanceId)
                        .header("Authorization", "Bearer " + operatorToken))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/ambulances/" + ambulanceId)
                        .header("Authorization", "Bearer " + bearerToken(301L, "AMBULANCE_OPERATOR")))
                .andExpect(status().isForbidden());

        // Check active emergency endpoint
        mockMvc.perform(get("/api/emergency/my-active")
                .header("Authorization", "Bearer " + patientToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(emergencyId))
                .andExpect(jsonPath("$.ambulanceId").value(ambulanceId))
                .andExpect(jsonPath("$.assignmentId").value(assignmentId))
                .andExpect(jsonPath("$.distanceKm").value(0.0));

        // Operator sees active assignment
        mockMvc.perform(get("/api/ambulance/operator/active")
                .header("Authorization", "Bearer " + operatorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(emergencyId))
                .andExpect(jsonPath("$.ambulanceId").value(ambulanceId))
                .andExpect(jsonPath("$.assignmentId").value(assignmentId))
                .andExpect(jsonPath("$.distanceKm").value(0.0));

        mockMvc.perform(get("/api/ambulance/operator/active")
                .header("Authorization", "Bearer " + patientToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/emergency/" + emergencyId)
                .header("Authorization", "Bearer " + bearerToken(101L, "PATIENT")))
                .andExpect(status().isForbidden());

        mockMvc.perform(patch("/api/emergency/" + emergencyId + "/advance")
                .header("Authorization", "Bearer " + patientToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(patch("/api/emergency/" + emergencyId + "/advance")
                .header("Authorization", "Bearer " + bearerToken(301L, "AMBULANCE_OPERATOR")))
                .andExpect(status().isForbidden());

        mockMvc.perform(patch("/api/emergency/" + emergencyId + "/status?status=COMPLETED")
                .header("Authorization", "Bearer " + operatorToken))
                .andExpect(status().isNotFound());

        // The server advances exactly one valid lifecycle step per operator action.
        mockMvc.perform(patch("/api/emergency/" + emergencyId + "/advance")
                .header("Authorization", "Bearer " + operatorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("EN_ROUTE"));

        mockMvc.perform(get("/api/emergency/my-active")
                .header("Authorization", "Bearer " + patientToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("EN_ROUTE"));

        mockMvc.perform(patch("/api/emergency/" + emergencyId + "/advance")
                .header("Authorization", "Bearer " + operatorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ARRIVED"));

        mockMvc.perform(patch("/api/emergency/" + emergencyId + "/advance")
                .header("Authorization", "Bearer " + operatorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PATIENT_PICKED"));

        mockMvc.perform(patch("/api/emergency/" + emergencyId + "/advance")
                .header("Authorization", "Bearer " + operatorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("HOSPITAL_REACHED"));

        mockMvc.perform(patch("/api/emergency/" + emergencyId + "/advance")
                .header("Authorization", "Bearer " + operatorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("COMPLETED"));

        assertEquals(EmergencyStatus.COMPLETED,
                emergencyRequestRepository.findById(emergencyId).orElseThrow().getStatus());

        // After completion, ambulance becomes AVAILABLE again
        mockMvc.perform(get("/api/ambulances/available")
                .header("Authorization", "Bearer " + patientToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/ambulances/available")
                .header("Authorization", "Bearer " + bearerToken(901L, "ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].status").value("AVAILABLE"));
    }

    @Test
    void emergencyRequestRequiresAuthenticatedPatientAndGpsCoordinates() throws Exception {
        mockMvc.perform(post("/api/emergency/request")
                .header("X-User-Id", "100")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());

        EmergencyCreateRequest withoutGps = EmergencyCreateRequest.builder()
                .pickupAddress("Village Center")
                .build();
        mockMvc.perform(post("/api/emergency/request")
                .header("Authorization", "Bearer " + bearerToken(100L, "PATIENT"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(withoutGps)))
                .andExpect(status().isBadRequest());

        EmergencyCreateRequest outOfRangeGps = EmergencyCreateRequest.builder()
                .pickupAddress("Village Center")
                .pickupLatitude(91.0)
                .pickupLongitude(181.0)
                .build();
        mockMvc.perform(post("/api/emergency/request")
                .header("Authorization", "Bearer " + bearerToken(100L, "PATIENT"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(outOfRangeGps)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void operatorGpsUpdateIsPersistedAndVisibleToAssignedPatient() throws Exception {
        String patientToken = bearerToken(100L, "PATIENT");
        String operatorToken = bearerToken(300L, "AMBULANCE_OPERATOR");
        String otherOperatorToken = bearerToken(301L, "AMBULANCE_OPERATOR");

        MvcResult createResult = mockMvc.perform(post("/api/emergency/request")
                .header("Authorization", "Bearer " + patientToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();
        var created = objectMapper.readTree(createResult.getResponse().getContentAsString());
        Long emergencyId = created.get("id").asLong();
        Long ambulanceId = created.get("ambulanceId").asLong();
        Instant reportedAt = Instant.now().truncatedTo(java.time.temporal.ChronoUnit.MILLIS);

        String locationUpdate = objectMapper.writeValueAsString(Map.of(
                "latitude", 17.40125,
                "longitude", 78.51234,
                "timestamp", reportedAt.toString()));
        mockMvc.perform(patch("/api/ambulances/" + ambulanceId + "/location")
                .header("Authorization", "Bearer " + operatorToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(locationUpdate))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.latitude").value(17.40125))
                .andExpect(jsonPath("$.longitude").value(78.51234))
                .andExpect(jsonPath("$.lastLocationUpdate").value(reportedAt.toString()));

        Ambulance stored = ambulanceRepository.findById(ambulanceId).orElseThrow();
        assertEquals(17.40125, stored.getLatitude());
        assertEquals(78.51234, stored.getLongitude());
        assertEquals(LocalDateTime.ofInstant(reportedAt, java.time.ZoneId.systemDefault()), stored.getLastLocationUpdate());

        mockMvc.perform(get("/api/emergency/my-active")
                .header("Authorization", "Bearer " + patientToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(emergencyId))
                .andExpect(jsonPath("$.assignedAmbulance.latitude").value(17.40125))
                .andExpect(jsonPath("$.assignedAmbulance.longitude").value(78.51234))
                .andExpect(jsonPath("$.assignedAmbulance.lastLocationUpdate").value(reportedAt.toString()));

        mockMvc.perform(patch("/api/ambulances/" + ambulanceId + "/location")
                .header("Authorization", "Bearer " + otherOperatorToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(locationUpdate))
                .andExpect(status().isForbidden());

        mockMvc.perform(patch("/api/ambulances/" + ambulanceId + "/location")
                .header("Authorization", "Bearer " + operatorToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"latitude\":17.4,\"longitude\":78.5}"))
                .andExpect(status().isBadRequest());

        mockMvc.perform(patch("/api/ambulances/" + ambulanceId + "/location")
                .header("Authorization", "Bearer " + operatorToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                        "latitude", 91.0,
                        "longitude", 78.5,
                        "timestamp", reportedAt.plusSeconds(1).toString()))))
                .andExpect(status().isBadRequest());

        mockMvc.perform(get("/api/emergency/" + emergencyId)
                .header("Authorization", "Bearer " + bearerToken(101L, "PATIENT")))
                .andExpect(status().isForbidden());
    }

    // 2. Mandatory Concurrency Test: 2 simultaneous emergency requests with only 1 ambulance available
    @Test
    void testConcurrentAmbulanceAssignmentProtection() throws Exception {
        ExecutorService executor = Executors.newFixedThreadPool(2);
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);

        Callable<EmergencyResponse> task1 = () -> {
            ready.countDown();
            start.await();
            return emergencyService.createEmergencyRequest(101L, request);
        };
        Callable<EmergencyResponse> task2 = () -> {
            ready.countDown();
            start.await();
            return emergencyService.createEmergencyRequest(102L, request);
        };

        Future<EmergencyResponse> future1 = executor.submit(task1);
        Future<EmergencyResponse> future2 = executor.submit(task2);
        assertTrue(ready.await(5, TimeUnit.SECONDS), "Both assignment requests did not become ready");
        start.countDown();

        EmergencyResponse res1 = future1.get(5, TimeUnit.SECONDS);
        EmergencyResponse res2 = future2.get(5, TimeUnit.SECONDS);

        executor.shutdownNow();

        // Exactly ONE request must get ASSIGNED status, and the OTHER must remain REQUESTED (unassigned)
        boolean oneAssigned = (res1.getStatus() == EmergencyStatus.ASSIGNED && res2.getStatus() == EmergencyStatus.REQUESTED) ||
                             (res1.getStatus() == EmergencyStatus.REQUESTED && res2.getStatus() == EmergencyStatus.ASSIGNED);

        assertTrue(oneAssigned, "Concurrency protection failed! Both requests received assignment or both failed. Res1: " +
                res1.getStatus() + ", Res2: " + res2.getStatus());
        assertEquals(1, assignmentRepository.count(), "One ambulance must create at most one assignment");
        assertEquals(1, emergencyRequestRepository.findAll().stream()
                .filter(emergency -> emergency.getStatus() == EmergencyStatus.ASSIGNED).count());
    }

    @Test
    void concurrentEmergenciesReserveDifferentAvailableAmbulances() throws Exception {
        AmbulanceOperator secondOperator = operatorRepository.save(AmbulanceOperator.builder()
                .userId(301L)
                .name("Second Demo Operator")
                .phone("+91 9999999998")
                .status(OperatorStatus.AVAILABLE)
                .build());
        ambulanceRepository.save(Ambulance.builder()
                .registrationNumber("AP-04-AM-1009")
                .vehicleType("BASIC")
                .status(AmbulanceStatus.AVAILABLE)
                .latitude(17.40)
                .longitude(78.50)
                .lastLocationUpdate(LocalDateTime.now())
                .operator(secondOperator)
                .build());

        ExecutorService executor = Executors.newFixedThreadPool(2);
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);
        Callable<EmergencyResponse> first = concurrentRequest(201L, ready, start);
        Callable<EmergencyResponse> second = concurrentRequest(202L, ready, start);
        Future<EmergencyResponse> firstResult = executor.submit(first);
        Future<EmergencyResponse> secondResult = executor.submit(second);

        assertTrue(ready.await(5, TimeUnit.SECONDS), "Both assignment requests did not become ready");
        start.countDown();
        EmergencyResponse one = firstResult.get(5, TimeUnit.SECONDS);
        EmergencyResponse two = secondResult.get(5, TimeUnit.SECONDS);
        executor.shutdownNow();

        assertEquals(EmergencyStatus.ASSIGNED, one.getStatus());
        assertEquals(EmergencyStatus.ASSIGNED, two.getStatus());
        assertNotNull(one.getAssignmentId());
        assertNotNull(two.getAssignmentId());
        assertNotEquals(one.getAssignmentId(), two.getAssignmentId());
        assertNotEquals(one.getAmbulanceId(), two.getAmbulanceId(), "Concurrent requests must reserve distinct units");
        assertEquals(2, assignmentRepository.count());
    }

    private Callable<EmergencyResponse> concurrentRequest(Long patientId, CountDownLatch ready, CountDownLatch start) {
        return () -> {
            ready.countDown();
            start.await();
            return emergencyService.createEmergencyRequest(patientId, request);
        };
    }

    private String bearerToken(Long userId, String role) {
        Instant now = Instant.now();
        return Jwts.builder()
                .claims(Map.of("userId", userId, "roles", List.of(role)))
                .subject("user-" + userId)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusSeconds(3600)))
                .signWith(Keys.hmacShaKeyFor(JWT_SECRET.getBytes(StandardCharsets.UTF_8)))
                .compact();
    }
}
