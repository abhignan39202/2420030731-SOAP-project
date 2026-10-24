package com.rhc.ambulanceservice.service;

import com.rhc.ambulanceservice.dto.*;
import com.rhc.ambulanceservice.entity.*;
import com.rhc.ambulanceservice.exception.*;
import com.rhc.ambulanceservice.repository.*;
import com.rhc.notificationcontract.NotificationEvent;
import com.rhc.notificationcontract.NotificationEventPublisher;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.Instant;
import java.time.ZoneId;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EmergencyService {

    @Autowired(required = false)
    private NotificationEventPublisher notificationEventPublisher;

    private final EmergencyRequestRepository emergencyRequestRepository;
    private final AmbulanceRepository ambulanceRepository;
    private final AmbulanceOperatorRepository operatorRepository;
    private final EmergencyAssignmentRepository assignmentRepository;

    @Value("${ambulance.average-speed-kmh:40.0}")
    private double averageSpeedKmh;

    private static final List<EmergencyStatus> ACTIVE_STATUSES = List.of(
            EmergencyStatus.REQUESTED, EmergencyStatus.ASSIGNED, EmergencyStatus.EN_ROUTE,
            EmergencyStatus.ARRIVED, EmergencyStatus.PATIENT_PICKED, EmergencyStatus.HOSPITAL_REACHED
    );

    /**
     * Create a patient-initiated emergency request and assign the nearest available staffed unit.
     * Uses pessimistic locking to prevent concurrent double-assignment.
     */
    @Transactional
    public EmergencyResponse createEmergencyRequest(Long patientId, EmergencyCreateRequest request) {
        // 1. Prevent duplicate active emergency for same patient
        List<EmergencyRequest> activeRequests = emergencyRequestRepository.findActiveByPatientId(patientId, ACTIVE_STATUSES);
        if (!activeRequests.isEmpty()) {
            throw new DuplicateActiveEmergencyException(
                    "Patient already has an active emergency request (ID: " + activeRequests.get(0).getId() + ")");
        }

        // 2. Create emergency request
        EmergencyRequest emergency = EmergencyRequest.builder()
                .patientId(patientId)
                .pickupAddress(request.getPickupAddress())
                .pickupLatitude(request.getPickupLatitude())
                .pickupLongitude(request.getPickupLongitude())
                .emergencyDescription(request.getEmergencyDescription())
                .hospitalName(request.getHospitalName())
                .hospitalAddress(request.getHospitalAddress())
                .status(EmergencyStatus.REQUESTED)
                .build();

        emergency = emergencyRequestRepository.save(emergency);

        // 3. Lock available units while calculating the nearest suitable candidate.
        List<Ambulance> availableAmbulances = ambulanceRepository.findAvailableWithLock(AmbulanceStatus.AVAILABLE)
                .stream()
                .filter(ambulance -> ambulance.getOperator() != null
                        && ambulance.getOperator().getStatus() == OperatorStatus.AVAILABLE
                        && hasValidCoordinates(ambulance))
                .toList();

        if (availableAmbulances.isEmpty()) {
            // Save as REQUESTED without assignment - can be assigned later
            return mapToResponse(emergency);
        }

        // 4. Attempt candidates in distance order. The conditional DB update is an
        // atomic compare-and-set in addition to the pessimistic selection lock.
        Ambulance nearest = null;
        double assignmentDistanceKm = 0.0;
        for (Ambulance candidate : availableAmbulances.stream()
                .sorted(Comparator.comparingDouble(ambulance -> haversineDistance(
                        request.getPickupLatitude(), request.getPickupLongitude(),
                        ambulance.getLatitude(), ambulance.getLongitude())))
                .toList()) {
            int claimed = ambulanceRepository.reserveIfAvailable(
                    candidate.getId(), AmbulanceStatus.AVAILABLE, AmbulanceStatus.ASSIGNED);
            if (claimed == 1) {
                nearest = candidate;
                assignmentDistanceKm = haversineDistance(request.getPickupLatitude(), request.getPickupLongitude(),
                        candidate.getLatitude(), candidate.getLongitude());
                // Keep the managed entity consistent with the bulk update.
                nearest.setStatus(AmbulanceStatus.ASSIGNED);
                break;
            }
        }

        if (nearest == null) {
            return mapToResponse(emergency);
        }

        AmbulanceOperator operator = nearest.getOperator();
        operator.setStatus(OperatorStatus.ASSIGNED);
        operatorRepository.save(operator);

        emergency.setAssignedAmbulance(nearest);
        emergency.setAssignedOperator(operator);
        emergency.setStatus(EmergencyStatus.ASSIGNED);
        emergency = emergencyRequestRepository.save(emergency);

        // 5. Persist the assignment and its calculated distance.
        EmergencyAssignment assignment = EmergencyAssignment.builder()
                .emergencyRequest(emergency)
                .ambulance(nearest)
                .operator(operator)
                .distanceKm(assignmentDistanceKm)
                .build();
        assignment = assignmentRepository.save(assignment);

        publishAssignmentNotification(emergency.getPatientId(), emergency, assignment, assignmentDistanceKm,
                "Ambulance assigned", "An ambulance has been assigned to your emergency.");
        publishAssignmentNotification(operator.getUserId(), emergency, assignment, assignmentDistanceKm,
                "Emergency assignment", "You have been assigned emergency #" + emergency.getId() + ".");

        return mapToResponse(emergency, assignment);
    }

    @Transactional(readOnly = true)
    public EmergencyResponse getEmergencyById(Long id, Long userId) {
        EmergencyRequest emergency = emergencyRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Emergency request not found with id " + id));

        // Access control: patient can see own, operator can see assigned
        boolean isPatient = emergency.getPatientId().equals(userId);
        boolean isOperator = emergency.getAssignedOperator() != null &&
                emergency.getAssignedOperator().getUserId().equals(userId);

        if (!isPatient && !isOperator) {
            throw new UnauthorizedException("You do not have permission to access this emergency request");
        }

        return mapToResponse(emergency);
    }

    @Transactional(readOnly = true)
    public EmergencyResponse getMyActiveEmergency(Long patientId) {
        List<EmergencyRequest> active = emergencyRequestRepository.findActiveByPatientId(patientId, ACTIVE_STATUSES);
        if (active.isEmpty()) {
            return null;
        }
        return mapToResponse(active.get(0));
    }

    @Transactional(readOnly = true)
    public List<EmergencyResponse> getPatientHistory(Long patientId) {
        return emergencyRequestRepository.findByPatientIdOrderByCreatedAtDesc(patientId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public EmergencyResponse cancelEmergency(Long id, Long userId) {
        EmergencyRequest emergency = emergencyRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Emergency request not found with id " + id));

        if (!emergency.getPatientId().equals(userId)) {
            throw new UnauthorizedException("Only the requesting patient can cancel this emergency");
        }

        if (!emergency.getStatus().canTransitionTo(EmergencyStatus.CANCELLED)) {
            throw new InvalidStatusTransitionException(
                    "Cannot cancel emergency in status " + emergency.getStatus());
        }

        // Release ambulance and operator
        releaseAmbulanceAndOperator(emergency);

        emergency.setStatus(EmergencyStatus.CANCELLED);
        emergency.setCompletedAt(LocalDateTime.now());
        emergency = emergencyRequestRepository.save(emergency);
        return mapToResponse(emergency);
    }

    private void publishAmbulanceNotification(String eventType, Long recipientUserId, EmergencyRequest emergency,
                                              String title, String body) {
        if (notificationEventPublisher != null) {
            notificationEventPublisher.publish(NotificationEvent.now(eventType, recipientUserId, title, body,
                    java.util.Map.of("emergencyId", emergency.getId().toString())));
        }
    }

    private void publishAssignmentNotification(Long recipientUserId, EmergencyRequest emergency,
                                               EmergencyAssignment assignment, double distanceKm,
                                               String title, String body) {
        if (notificationEventPublisher != null) {
            notificationEventPublisher.publish(NotificationEvent.now("AMBULANCE_ASSIGNED", recipientUserId, title, body,
                    java.util.Map.of(
                            "emergencyId", emergency.getId().toString(),
                            "ambulanceId", assignment.getAmbulance().getId().toString(),
                            "assignmentId", assignment.getId().toString(),
                            "distanceKm", Double.toString(distanceKm),
                            "status", emergency.getStatus().name())));
        }
    }

    /**
     * Operator updates emergency status through the lifecycle.
     * Only the assigned operator can transition statuses.
     */
    @Transactional
    public EmergencyResponse advanceEmergencyStatus(Long id, Long operatorUserId) {
        EmergencyRequest emergency = emergencyRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Emergency request not found with id " + id));

        // Verify operator is the assigned one
        if (emergency.getAssignedOperator() == null ||
                !emergency.getAssignedOperator().getUserId().equals(operatorUserId)) {
            throw new UnauthorizedException("Only the assigned operator can update emergency status");
        }

        EmergencyStatus newStatus = switch (emergency.getStatus()) {
            case ASSIGNED -> EmergencyStatus.EN_ROUTE;
            case EN_ROUTE -> EmergencyStatus.ARRIVED;
            case ARRIVED -> EmergencyStatus.PATIENT_PICKED;
            case PATIENT_PICKED -> EmergencyStatus.HOSPITAL_REACHED;
            case HOSPITAL_REACHED -> EmergencyStatus.COMPLETED;
            default -> throw new InvalidStatusTransitionException(
                    "Emergency in status " + emergency.getStatus() + " cannot be advanced by an operator");
        };

        if (!emergency.getStatus().canTransitionTo(newStatus)) {
            throw new InvalidStatusTransitionException(
                    "Cannot transition from " + emergency.getStatus() + " to " + newStatus);
        }

        emergency.setStatus(newStatus);

        // Update ambulance status to match
        Ambulance ambulance = emergency.getAssignedAmbulance();
        if (ambulance != null) {
            switch (newStatus) {
                case EN_ROUTE -> ambulance.setStatus(AmbulanceStatus.EN_ROUTE);
                case ARRIVED -> ambulance.setStatus(AmbulanceStatus.ON_SCENE);
                case PATIENT_PICKED -> ambulance.setStatus(AmbulanceStatus.PATIENT_TRANSPORTING);
                case COMPLETED -> {
                    ambulance.setStatus(AmbulanceStatus.AVAILABLE);
                    emergency.setCompletedAt(LocalDateTime.now());
                    // Release operator
                    if (emergency.getAssignedOperator() != null) {
                        emergency.getAssignedOperator().setStatus(OperatorStatus.AVAILABLE);
                        operatorRepository.save(emergency.getAssignedOperator());
                    }
                    // Update assignment completion
                    assignmentRepository.findByEmergencyRequestId(id).ifPresent(a -> {
                        a.setCompletedAt(LocalDateTime.now());
                        assignmentRepository.save(a);
                    });
                }
                default -> { /* no ambulance status change needed */ }
            }
            ambulanceRepository.save(ambulance);
        }

        emergency = emergencyRequestRepository.save(emergency);
        switch (newStatus) {
            case EN_ROUTE -> publishAmbulanceNotification("AMBULANCE_EN_ROUTE", emergency.getPatientId(), emergency,
                    "Ambulance en route", "Your ambulance is on the way.");
            case ARRIVED -> publishAmbulanceNotification("AMBULANCE_ARRIVED", emergency.getPatientId(), emergency,
                    "Ambulance arrived", "Your ambulance has arrived.");
            case PATIENT_PICKED -> publishAmbulanceNotification("PATIENT_PICKED", emergency.getPatientId(), emergency,
                    "Patient picked up", "You have been picked up by the ambulance.");
            case HOSPITAL_REACHED -> publishAmbulanceNotification("HOSPITAL_REACHED", emergency.getPatientId(), emergency,
                    "Hospital reached", "You have reached the hospital.");
            case COMPLETED -> publishAmbulanceNotification("EMERGENCY_COMPLETED", emergency.getPatientId(), emergency,
                    "Emergency transport completed", "Your emergency transport has been completed.");
            default -> { }
        }
        return mapToResponse(emergency);
    }

    @Transactional(readOnly = true)
    public EmergencyResponse getOperatorActiveEmergency(Long operatorUserId) {
        AmbulanceOperator operator = operatorRepository.findByUserId(operatorUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Operator not found for userId " + operatorUserId));

        return emergencyRequestRepository.findActiveByOperatorId(operator.getId(), ACTIVE_STATUSES)
                .map(this::mapToResponse)
                .orElse(null);
    }

    @Transactional(readOnly = true)
    public List<EmergencyResponse> getOperatorHistory(Long operatorUserId) {
        AmbulanceOperator operator = operatorRepository.findByUserId(operatorUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Operator not found for userId " + operatorUserId));

        return emergencyRequestRepository.findByOperatorIdOrderByCreatedAtDesc(operator.getId()).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    // ---- Ambulance Management ----

    @Transactional
    public AmbulanceResponse createAmbulance(AmbulanceCreateRequest request) {
        ambulanceRepository.findByRegistrationNumber(request.getRegistrationNumber()).ifPresent(a -> {
            throw new InvalidStatusTransitionException("Ambulance with registration " + request.getRegistrationNumber() + " already exists");
        });

        AmbulanceOperator operator = null;
        if (request.getOperatorId() != null) {
            operator = operatorRepository.findById(request.getOperatorId())
                    .orElseThrow(() -> new ResourceNotFoundException("Operator not found with id " + request.getOperatorId()));
        }

        Ambulance ambulance = Ambulance.builder()
                .registrationNumber(request.getRegistrationNumber())
                .vehicleType(request.getVehicleType())
                .status(AmbulanceStatus.AVAILABLE)
                .latitude(request.getLatitude())
                .longitude(request.getLongitude())
                .lastLocationUpdate(LocalDateTime.now())
                .operator(operator)
                .build();

        ambulance = ambulanceRepository.save(ambulance);
        return mapToAmbulanceResponse(ambulance);
    }

    @Transactional(readOnly = true)
    public List<AmbulanceResponse> getAvailableAmbulances() {
        return ambulanceRepository.findByStatus(AmbulanceStatus.AVAILABLE).stream()
                .map(this::mapToAmbulanceResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public AmbulanceResponse getAmbulanceById(Long id, Long requesterId, boolean isAdmin) {
        Ambulance ambulance = ambulanceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ambulance not found with id " + id));
        if (!isAdmin && (ambulance.getOperator() == null
                || !ambulance.getOperator().getUserId().equals(requesterId))) {
            throw new UnauthorizedException("Only the assigned operator or an administrator can view this ambulance");
        }
        return mapToAmbulanceResponse(ambulance);
    }

    @Transactional
    public AmbulanceResponse updateAmbulanceLocation(Long id, LocationUpdateRequest request, Long operatorUserId) {
        Ambulance ambulance = ambulanceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ambulance not found with id " + id));

        // Only assigned operator can update location
        if (ambulance.getOperator() == null || !ambulance.getOperator().getUserId().equals(operatorUserId)) {
            throw new UnauthorizedException("Only the assigned operator can update ambulance location");
        }

        Instant timestamp = request.getTimestamp();
        if (timestamp.isAfter(Instant.now().plusSeconds(60))) {
            throw new InvalidStatusTransitionException("Location timestamp cannot be more than 60 seconds in the future");
        }
        LocalDateTime reportedAt = LocalDateTime.ofInstant(timestamp, ZoneId.systemDefault());
        if (ambulance.getLastLocationUpdate() != null && reportedAt.isBefore(ambulance.getLastLocationUpdate())) {
            throw new InvalidStatusTransitionException("A newer ambulance location has already been stored");
        }

        ambulance.setLatitude(request.getLatitude());
        ambulance.setLongitude(request.getLongitude());
        ambulance.setLastLocationUpdate(reportedAt);
        ambulance = ambulanceRepository.save(ambulance);
        return mapToAmbulanceResponse(ambulance);
    }

    // ---- Operator Management ----

    @Transactional
    public OperatorResponse createOperator(OperatorCreateRequest request) {
        operatorRepository.findByUserId(request.getUserId()).ifPresent(o -> {
            throw new InvalidStatusTransitionException("Operator already exists for userId " + request.getUserId());
        });

        AmbulanceOperator operator = AmbulanceOperator.builder()
                .userId(request.getUserId())
                .name(request.getName())
                .phone(request.getPhone())
                .status(OperatorStatus.AVAILABLE)
                .build();

        operator = operatorRepository.save(operator);
        return mapToOperatorResponse(operator);
    }

    @Transactional
    public OperatorResponse updateOperator(Long userId, OperatorCreateRequest request) {
        AmbulanceOperator operator = operatorRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Operator not found for userId " + userId));
        operator.setName(request.getName());
        operator.setPhone(request.getPhone());
        return mapToOperatorResponse(operatorRepository.save(operator));
    }

    @Transactional(readOnly = true)
    public OperatorResponse getOperator(Long userId) {
        AmbulanceOperator operator = operatorRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Operator not found for userId " + userId));
        return mapToOperatorResponse(operator);
    }

    // ---- Haversine Distance Calculation ----

    private boolean hasValidCoordinates(Ambulance ambulance) {
        return ambulance.getLatitude() != null && ambulance.getLongitude() != null
                && ambulance.getLatitude() >= -90.0 && ambulance.getLatitude() <= 90.0
                && ambulance.getLongitude() >= -180.0 && ambulance.getLongitude() <= 180.0;
    }

    /**
     * Haversine formula for approximate distance between two GPS coordinates.
     * Returns distance in kilometers.
     * Note: This is a simulated academic calculation, not real GPS precision.
     */
    static double haversineDistance(double lat1, double lon1, double lat2, double lon2) {
        final double R = 6371.0; // Earth radius in km
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double clampedA = Math.max(0.0, Math.min(1.0, a));
        double c = 2 * Math.atan2(Math.sqrt(clampedA), Math.sqrt(1 - clampedA));
        return R * c;
    }

    private Double calculateEstimatedArrivalMinutes(EmergencyRequest emergency) {
        if (emergency.getAssignedAmbulance() == null) return null;
        Ambulance amb = emergency.getAssignedAmbulance();
        if (amb.getLatitude() == null || amb.getLongitude() == null) return null;
        if (emergency.getPickupLatitude() == null || emergency.getPickupLongitude() == null) return null;

        // Only calculate ETA for active en-route states
        if (emergency.getStatus() != EmergencyStatus.ASSIGNED && emergency.getStatus() != EmergencyStatus.EN_ROUTE) {
            return null;
        }

        double distKm = haversineDistance(amb.getLatitude(), amb.getLongitude(),
                emergency.getPickupLatitude(), emergency.getPickupLongitude());
        // ETA = distance / speed * 60 (convert hours to minutes)
        return Math.round((distKm / averageSpeedKmh) * 60.0 * 10.0) / 10.0;
    }

    private void releaseAmbulanceAndOperator(EmergencyRequest emergency) {
        if (emergency.getAssignedAmbulance() != null) {
            Ambulance amb = emergency.getAssignedAmbulance();
            amb.setStatus(AmbulanceStatus.AVAILABLE);
            ambulanceRepository.save(amb);
        }
        if (emergency.getAssignedOperator() != null) {
            AmbulanceOperator op = emergency.getAssignedOperator();
            op.setStatus(OperatorStatus.AVAILABLE);
            operatorRepository.save(op);
        }
    }

    // ---- Mappers ----

    private EmergencyResponse mapToResponse(EmergencyRequest e) {
        EmergencyAssignment assignment = assignmentRepository.findByEmergencyRequestId(e.getId()).orElse(null);
        return mapToResponse(e, assignment);
    }

    private EmergencyResponse mapToResponse(EmergencyRequest e, EmergencyAssignment assignment) {
        return EmergencyResponse.builder()
                .id(e.getId())
                .patientId(e.getPatientId())
                .pickupAddress(e.getPickupAddress())
                .pickupLatitude(e.getPickupLatitude())
                .pickupLongitude(e.getPickupLongitude())
                .emergencyDescription(e.getEmergencyDescription())
                .status(e.getStatus())
                .ambulanceId(e.getAssignedAmbulance() != null ? e.getAssignedAmbulance().getId() : null)
                .assignmentId(assignment != null ? assignment.getId() : null)
                .distanceKm(assignment != null ? assignment.getDistanceKm() : null)
                .assignedAmbulance(e.getAssignedAmbulance() != null ? mapToAmbulanceResponse(e.getAssignedAmbulance()) : null)
                .assignedOperator(e.getAssignedOperator() != null ? mapToOperatorResponse(e.getAssignedOperator()) : null)
                .hospitalName(e.getHospitalName())
                .hospitalAddress(e.getHospitalAddress())
                .estimatedArrivalMinutes(calculateEstimatedArrivalMinutes(e))
                .createdAt(e.getCreatedAt())
                .updatedAt(e.getUpdatedAt())
                .completedAt(e.getCompletedAt())
                .build();
    }

    private AmbulanceResponse mapToAmbulanceResponse(Ambulance a) {
        return AmbulanceResponse.builder()
                .id(a.getId())
                .registrationNumber(a.getRegistrationNumber())
                .vehicleType(a.getVehicleType())
                .status(a.getStatus())
                .latitude(a.getLatitude())
                .longitude(a.getLongitude())
                .lastLocationUpdate(a.getLastLocationUpdate() == null ? null
                        : a.getLastLocationUpdate().atZone(ZoneId.systemDefault()).toInstant())
                .operatorId(a.getOperator() != null ? a.getOperator().getId() : null)
                .operatorName(a.getOperator() != null ? a.getOperator().getName() : null)
                .build();
    }

    private OperatorResponse mapToOperatorResponse(AmbulanceOperator o) {
        return OperatorResponse.builder()
                .id(o.getId())
                .userId(o.getUserId())
                .name(o.getName())
                .phone(o.getPhone())
                .status(o.getStatus())
                .build();
    }
}
