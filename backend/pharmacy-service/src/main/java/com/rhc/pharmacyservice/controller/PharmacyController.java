package com.rhc.pharmacyservice.controller;

import com.rhc.pharmacyservice.dto.*;
import com.rhc.pharmacyservice.service.NearbyPharmacyDiscoveryService;
import com.rhc.pharmacyservice.service.PharmacyService;
import com.rhc.pharmacyservice.exception.UnauthorizedException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/pharmacy")
@RequiredArgsConstructor
public class PharmacyController {

    private final PharmacyService pharmacyService;
    private final NearbyPharmacyDiscoveryService nearbyPharmacyDiscoveryService;

    private Long resolveUserId(HttpServletRequest request) {
        Object authenticatedId = request.getAttribute("userId");
        if (authenticatedId instanceof Number number) return number.longValue();
        if (authenticatedId != null) return Long.valueOf(String.valueOf(authenticatedId));
        throw new UnauthorizedException("Authenticated token must contain a user ID");
    }

    private String resolveRoles(HttpServletRequest request) {
        Object authenticatedRoles = request.getAttribute("roles");
        return authenticatedRoles == null ? "" : String.valueOf(authenticatedRoles);
    }

    private boolean hasRole(String roles, String expected) {
        return java.util.Arrays.stream(roles.replace("[", "").replace("]", "").split("[,\\s]+"))
                .map(role -> role.startsWith("ROLE_") ? role.substring(5) : role)
                .anyMatch(role -> role.equalsIgnoreCase(expected));
    }

    private Long requireRole(HttpServletRequest request, String role) {
        Long userId = resolveUserId(request);
        if (!hasRole(resolveRoles(request), role)) {
            throw new UnauthorizedException("Only " + role.toLowerCase() + " users can access this operation");
        }
        return userId;
    }

    private Long requirePharmacyOwner(HttpServletRequest request, Long pharmacyId) {
        Long userId = requireRole(request, "PHARMACY");
        if (!pharmacyService.isOwnedBy(pharmacyId, userId)) {
            throw new UnauthorizedException("Pharmacy account does not own this pharmacy");
        }
        return pharmacyId;
    }

    private Long requireOrderPharmacyOwner(HttpServletRequest request, Long orderId) {
        Long userId = requireRole(request, "PHARMACY");
        OrderResponse order = pharmacyService.getOrderById(orderId, userId, true);
        return requirePharmacyOwner(request, order.getPharmacyId());
    }

    @GetMapping("/pharmacies/me")
    public ResponseEntity<PharmacyResponse> getMyPharmacy(HttpServletRequest request) {
        return ResponseEntity.ok(pharmacyService.getOwnedPharmacy(requireRole(request, "PHARMACY")));
    }

    @GetMapping("/pharmacies")
    public ResponseEntity<List<PharmacyResponse>> getActivePharmacies() {
        return ResponseEntity.ok(pharmacyService.getActivePharmacies());
    }

    @GetMapping("/nearby")
    public ResponseEntity<List<NearbyPharmacyResponse>> getNearbyPharmacies(
            @RequestParam double latitude,
            @RequestParam double longitude,
            @RequestParam(required = false) Integer radiusMeters) {
        return ResponseEntity.ok(nearbyPharmacyDiscoveryService.findNearby(latitude, longitude, radiusMeters));
    }

    @PostMapping("/pharmacies")
    public ResponseEntity<PharmacyResponse> registerPharmacy(
            HttpServletRequest requestContext,
            @Valid @RequestBody PharmacyCreateRequest request) {
        requireRole(requestContext, "ADMIN");
        return new ResponseEntity<>(pharmacyService.registerPharmacy(request), HttpStatus.CREATED);
    }

    @PatchMapping("/pharmacies/{pharmacyId}/owner")
    public ResponseEntity<PharmacyResponse> assignPharmacyOwner(
            HttpServletRequest requestContext,
            @PathVariable Long pharmacyId,
            @Valid @RequestBody PharmacyOwnerAssignmentRequest request) {
        requireRole(requestContext, "ADMIN");
        return ResponseEntity.ok(pharmacyService.assignOwner(pharmacyId, request.ownerUserId()));
    }

    @PutMapping("/pharmacies/{pharmacyId}")
    public ResponseEntity<PharmacyResponse> updatePharmacy(
            HttpServletRequest requestContext,
            @PathVariable Long pharmacyId,
            @Valid @RequestBody PharmacyCreateRequest body) {
        requirePharmacyOwner(requestContext, pharmacyId);
        return ResponseEntity.ok(pharmacyService.updatePharmacy(pharmacyId, body));
    }

    @GetMapping("/inventory/{pharmacyId}")
    public ResponseEntity<List<InventoryResponse>> getPharmacyInventory(
            HttpServletRequest requestContext,
            @PathVariable("pharmacyId") Long pharmacyId) {
        Long requester = resolveUserId(requestContext);
        String effectiveRoles = resolveRoles(requestContext);
        boolean pharmacyOwner = hasRole(effectiveRoles, "PHARMACY") && pharmacyService.isOwnedBy(pharmacyId, requester);
        if (!hasRole(effectiveRoles, "PATIENT") && !pharmacyOwner) {
            throw new UnauthorizedException("You do not have permission to view this pharmacy inventory");
        }
        return ResponseEntity.ok(pharmacyService.getPharmacyInventory(pharmacyId));
    }

    @PostMapping("/inventory/{pharmacyId}")
    public ResponseEntity<InventoryResponse> addOrUpdateInventory(
            HttpServletRequest requestContext,
            @PathVariable("pharmacyId") Long pharmacyId,
            @Valid @RequestBody InventoryRequest body) {
        requirePharmacyOwner(requestContext, pharmacyId);
        return ResponseEntity.ok(pharmacyService.addOrUpdateInventory(pharmacyId, body));
    }

    @PostMapping("/orders")
    public ResponseEntity<OrderResponse> createOrder(
            HttpServletRequest requestContext,
            @Valid @RequestBody OrderCreateRequest body) {
        Long patientId = requireRole(requestContext, "PATIENT");
        OrderResponse response = pharmacyService.createOrder(patientId, body);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @GetMapping("/orders/{id}")
    public ResponseEntity<OrderResponse> getOrderById(
            HttpServletRequest request,
            @PathVariable("id") Long id) {
        Long userId = resolveUserId(request);
        String effectiveRoles = resolveRoles(request);
        boolean pharmacyUser = hasRole(effectiveRoles, "PHARMACY");
        if (!pharmacyUser && !hasRole(effectiveRoles, "PATIENT")) throw new UnauthorizedException("Patient or pharmacy access is required");
        return ResponseEntity.ok(pharmacyService.getOrderById(id, userId, pharmacyUser));
    }

    @GetMapping("/orders/patient")
    public ResponseEntity<List<OrderResponse>> getPatientOrders(
            HttpServletRequest request) {
        Long patientId = requireRole(request, "PATIENT");
        return ResponseEntity.ok(pharmacyService.getPatientOrders(patientId));
    }

    @GetMapping("/orders/pharmacy/{pharmacyId}")
    public ResponseEntity<List<OrderResponse>> getPharmacyOrders(
            HttpServletRequest request,
            @PathVariable("pharmacyId") Long pharmacyId) {
        requirePharmacyOwner(request, pharmacyId);
        return ResponseEntity.ok(pharmacyService.getPharmacyOrders(pharmacyId));
    }

    @PatchMapping({"/orders/{id}/confirm", "/orders/{id}/processing"})
    public ResponseEntity<OrderResponse> confirmOrder(
            HttpServletRequest request,
            @PathVariable("id") Long id) {
        Long pharmacyId = requireOrderPharmacyOwner(request, id);
        return ResponseEntity.ok(pharmacyService.confirmOrder(id, pharmacyId));
    }

    @PatchMapping("/orders/{id}/preparing")
    public ResponseEntity<OrderResponse> setPreparing(
            HttpServletRequest request,
            @PathVariable("id") Long id) {
        Long pharmacyId = requireOrderPharmacyOwner(request, id);
        return ResponseEntity.ok(pharmacyService.setPreparing(id, pharmacyId));
    }

    @PatchMapping("/orders/{id}/ready")
    public ResponseEntity<OrderResponse> setReady(
            HttpServletRequest request,
            @PathVariable("id") Long id) {
        Long pharmacyId = requireOrderPharmacyOwner(request, id);
        return ResponseEntity.ok(pharmacyService.setReady(id, pharmacyId));
    }

    @PatchMapping("/orders/{id}/dispatched")
    public ResponseEntity<OrderResponse> setDispatched(
            HttpServletRequest request,
            @PathVariable("id") Long id) {
        Long pharmacyId = requireOrderPharmacyOwner(request, id);
        return ResponseEntity.ok(pharmacyService.setDispatched(id, pharmacyId));
    }

    @PatchMapping("/orders/{id}/delivered")
    public ResponseEntity<OrderResponse> setDelivered(
            HttpServletRequest request,
            @PathVariable("id") Long id) {
        Long pharmacyId = requireOrderPharmacyOwner(request, id);
        return ResponseEntity.ok(pharmacyService.setDelivered(id, pharmacyId));
    }

    @PatchMapping("/orders/{id}/cancel")
    public ResponseEntity<OrderResponse> cancelOrder(
            HttpServletRequest request,
            @PathVariable("id") Long id) {
        Long userId = resolveUserId(request);
        String effectiveRoles = resolveRoles(request);
        boolean pharmacyUser = hasRole(effectiveRoles, "PHARMACY");
        if (!pharmacyUser && !hasRole(effectiveRoles, "PATIENT")) throw new UnauthorizedException("Patient or pharmacy access is required");
        return ResponseEntity.ok(pharmacyService.cancelOrder(id, userId, pharmacyUser));
    }
}
