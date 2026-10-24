package com.rhc.pharmacyservice.service;

import com.rhc.pharmacyservice.client.PrescriptionClient;
import com.rhc.pharmacyservice.dto.*;
import com.rhc.pharmacyservice.entity.*;
import com.rhc.pharmacyservice.exception.*;
import com.rhc.pharmacyservice.repository.*;
import com.rhc.notificationcontract.NotificationEvent;
import com.rhc.notificationcontract.NotificationEventPublisher;
import feign.FeignException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PharmacyService {

    @Autowired(required = false)
    private NotificationEventPublisher notificationEventPublisher;

    private final PharmacyRepository pharmacyRepository;
    private final MedicineInventoryRepository inventoryRepository;
    private final PharmacyOrderRepository orderRepository;
    private final PrescriptionClient prescriptionClient;

    @Transactional
    public PharmacyResponse registerPharmacy(PharmacyCreateRequest request) {
        pharmacyRepository.findByLicenseNumber(request.getLicenseNumber()).ifPresent(p -> {
            throw new InvalidStatusTransitionException("Pharmacy with license number already exists: " + request.getLicenseNumber());
        });
        Pharmacy pharmacy = Pharmacy.builder()
                .name(request.getName())
                .licenseNumber(request.getLicenseNumber())
                .address(request.getAddress())
                .phone(request.getPhone())
                .email(request.getEmail())
                .status(PharmacyStatus.ACTIVE)
                .build();

        Pharmacy saved = pharmacyRepository.save(pharmacy);
        return mapToPharmacyResponse(saved);
    }

    @Transactional
    public PharmacyResponse assignOwner(Long pharmacyId, Long ownerUserId) {
        Pharmacy pharmacy = pharmacyRepository.findById(pharmacyId)
                .orElseThrow(() -> new ResourceNotFoundException("Pharmacy not found with id " + pharmacyId));
        if (pharmacyRepository.existsByOwnerUserId(ownerUserId)
                && !java.util.Objects.equals(pharmacy.getOwnerUserId(), ownerUserId)) {
            throw new InvalidStatusTransitionException("A pharmacy is already assigned to user " + ownerUserId);
        }
        pharmacy.setOwnerUserId(ownerUserId);
        return mapToPharmacyResponse(pharmacyRepository.save(pharmacy));
    }

    @Transactional(readOnly = true)
    public boolean isOwnedBy(Long pharmacyId, Long userId) {
        return pharmacyRepository.existsByIdAndOwnerUserId(pharmacyId, userId);
    }

    @Transactional(readOnly = true)
    public PharmacyResponse getOwnedPharmacy(Long userId) {
        return pharmacyRepository.findByOwnerUserId(userId).map(this::mapToPharmacyResponse)
                .orElseThrow(() -> new ResourceNotFoundException("No pharmacy is assigned to this account. Contact an administrator."));
    }

    @Transactional(readOnly = true)
    public List<PharmacyResponse> getActivePharmacies() {
        return pharmacyRepository.findByStatus(PharmacyStatus.ACTIVE).stream()
                .map(this::mapToPharmacyResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public PharmacyResponse updatePharmacy(Long pharmacyId, PharmacyCreateRequest request) {
        Pharmacy pharmacy = pharmacyRepository.findById(pharmacyId)
                .orElseThrow(() -> new ResourceNotFoundException("Pharmacy not found with id " + pharmacyId));
        pharmacy.setName(request.getName());
        pharmacy.setLicenseNumber(request.getLicenseNumber());
        pharmacy.setAddress(request.getAddress());
        pharmacy.setPhone(request.getPhone());
        pharmacy.setEmail(request.getEmail());
        return mapToPharmacyResponse(pharmacyRepository.save(pharmacy));
    }

    @Transactional
    public InventoryResponse addOrUpdateInventory(Long pharmacyId, InventoryRequest request) {
        Pharmacy pharmacy = pharmacyRepository.findById(pharmacyId)
                .orElseThrow(() -> new ResourceNotFoundException("Pharmacy not found with id " + pharmacyId));

        MedicineInventory inventory = inventoryRepository.findByPharmacyIdAndMedicineId(pharmacyId, request.getMedicineId())
                .orElseGet(() -> MedicineInventory.builder()
                        .pharmacy(pharmacy)
                        .medicineId(request.getMedicineId())
                        .medicineName(request.getMedicineName())
                        .availableQuantity(0)
                        .reservedQuantity(0)
                        .price(request.getPrice())
                        .active(true)
                        .build());

        inventory.setMedicineName(request.getMedicineName());
        inventory.setAvailableQuantity(request.getAvailableQuantity());
        inventory.setPrice(request.getPrice());

        MedicineInventory saved = inventoryRepository.save(inventory);
        return mapToInventoryResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<InventoryResponse> getPharmacyInventory(Long pharmacyId) {
        return inventoryRepository.findByPharmacyIdAndActiveTrue(pharmacyId).stream()
                .map(this::mapToInventoryResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public OrderResponse createOrder(Long patientId, OrderCreateRequest request) {
        // 1. Fetch & validate prescription via Feign
        PrescriptionResponse prescription;
        try {
            prescription = prescriptionClient.getPrescriptionById(request.getPrescriptionId());
        } catch (FeignException ex) {
            if (ex.status() == 401 || ex.status() == 403) {
                throw new UnauthorizedException("You do not have permission to order from this prescription");
            }
            if (ex.status() == 404) {
                throw new ResourceNotFoundException("Prescription not found with id " + request.getPrescriptionId());
            }
            throw ex;
        }
        if (prescription == null) {
            throw new ResourceNotFoundException("Prescription not found with id " + request.getPrescriptionId());
        }

        if (!"FINALIZED".equals(prescription.getStatus())) {
            throw new InvalidStatusTransitionException("Cannot order medicines for non-FINALIZED prescription status: " + prescription.getStatus());
        }

        if (!patientId.equals(prescription.getPatientId())) {
            throw new UnauthorizedException("Prescription does not belong to the requesting patient");
        }

        // 2. Validate Pharmacy
        Pharmacy pharmacy = pharmacyRepository.findById(request.getPharmacyId())
                .orElseThrow(() -> new ResourceNotFoundException("Pharmacy not found with id " + request.getPharmacyId()));

        if (pharmacy.getStatus() != PharmacyStatus.ACTIVE) {
            throw new InvalidStatusTransitionException("Pharmacy is not active for ordering");
        }

        // Inventory is authoritative for both availability and price. The conditional
        // update below is the final stock check and reservation in one database write.
        BigDecimal totalAmount = BigDecimal.ZERO;

        PharmacyOrder order = PharmacyOrder.builder()
                .patientId(patientId)
                .pharmacy(pharmacy)
                .prescriptionId(request.getPrescriptionId())
                .status(OrderStatus.PLACED)
                .deliveryAddress(request.getDeliveryAddress())
                .totalAmount(BigDecimal.ZERO)
                .build();

        for (OrderItemRequest itemReq : request.getItems()) {
            if (itemReq.getQuantity() == null || itemReq.getQuantity() < 1) {
                throw new InvalidStatusTransitionException("Order quantity must be at least one");
            }

            MedicineInventory inventory = inventoryRepository.findByPharmacyIdAndMedicineId(pharmacy.getId(), itemReq.getMedicineId())
                    .filter(MedicineInventory::isActive)
                    .orElseThrow(() -> new InsufficientStockException("Pharmacy does not carry medicine: " + itemReq.getMedicineName()));

            boolean inPrescription = prescription.getItems() != null && prescription.getItems().stream()
                    .anyMatch(prescribed -> samePrescribedMedicine(prescribed.getMedicineName(), inventory.getMedicineName()));
            if (!inPrescription) {
                throw new InvalidStatusTransitionException("Medicine '" + inventory.getMedicineName() + "' is not present in prescription #" + request.getPrescriptionId());
            }

            if (inventory.getAvailableQuantity() < itemReq.getQuantity()) {
                throw new InsufficientStockException("Insufficient stock for " + itemReq.getMedicineName() + ". Requested: " + itemReq.getQuantity() + ", Available: " + inventory.getAvailableQuantity());
            }

            int reserved = inventoryRepository.reserveAvailableStock(inventory.getId(), itemReq.getQuantity());
            if (reserved != 1) {
                throw new InsufficientStockException("Insufficient stock for " + inventory.getMedicineName() + ". Another order may have reserved the remaining stock.");
            }

            BigDecimal itemTotal = inventory.getPrice().multiply(BigDecimal.valueOf(itemReq.getQuantity()));
            totalAmount = totalAmount.add(itemTotal);

            PharmacyOrderItem item = PharmacyOrderItem.builder()
                    .medicineId(inventory.getMedicineId())
                    .medicineName(inventory.getMedicineName())
                    .quantity(itemReq.getQuantity())
                    .unitPrice(inventory.getPrice())
                    .totalPrice(itemTotal)
                    .build();

            order.addItem(item);
        }

        order.setTotalAmount(totalAmount);
        PharmacyOrder saved = orderRepository.save(order);
        return mapToOrderResponse(saved);
    }

    @Transactional
    public OrderResponse confirmOrder(Long orderId, Long pharmacyId) {
        return transitionOrder(orderId, pharmacyId, OrderStatus.PROCESSING);
    }

    @Transactional
    public OrderResponse setPreparing(Long orderId, Long pharmacyId) {
        return transitionOrder(orderId, pharmacyId, OrderStatus.PROCESSING);
    }

    @Transactional
    public OrderResponse setReady(Long orderId, Long pharmacyId) {
        return transitionOrder(orderId, pharmacyId, OrderStatus.READY);
    }

    @Transactional
    public OrderResponse setDispatched(Long orderId, Long pharmacyId) {
        return transitionOrder(orderId, pharmacyId, OrderStatus.DISPATCHED);
    }

    @Transactional
    public OrderResponse setDelivered(Long orderId, Long pharmacyId) {
        PharmacyOrder order = getOrderAndValidatePharmacy(orderId, pharmacyId);

        if (!order.getStatus().canTransitionTo(OrderStatus.DELIVERED)) {
            throw new InvalidStatusTransitionException("Cannot transition order from " + order.getStatus() + " to DELIVERED");
        }

        // Remove delivered quantities from reserved on-hand stock atomically.
        for (PharmacyOrderItem item : order.getItems()) {
            MedicineInventory inventory = inventoryRepository.findByPharmacyIdAndMedicineId(pharmacyId, item.getMedicineId())
                    .orElseThrow(() -> new InvalidStatusTransitionException("Reserved inventory record is missing for " + item.getMedicineName()));
            if (inventoryRepository.consumeReservedStock(inventory.getId(), item.getQuantity()) != 1) {
                throw new InvalidStatusTransitionException("Reserved stock is inconsistent for " + item.getMedicineName());
            }
        }

        order.setStatus(OrderStatus.DELIVERED);
        // Flush so the entity's @PreUpdate timestamp is available to the response as the delivery time.
        PharmacyOrder saved = orderRepository.saveAndFlush(order);
        publishOrderNotification("PHARMACY_ORDER_DELIVERED", saved,
                "Order delivered", "Your pharmacy order has been delivered.");
        return mapToOrderResponse(saved);
    }

    @Transactional
    public OrderResponse cancelOrder(Long orderId, Long userId, boolean pharmacyUser) {
        PharmacyOrder order = orderRepository.findByIdForUpdate(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id " + orderId));

        Long ownerId = pharmacyUser ? order.getPharmacy().getOwnerUserId() : order.getPatientId();
        if (userId == null || !java.util.Objects.equals(ownerId, userId)) {
            throw new UnauthorizedException("You do not have permission to cancel this order");
        }

        if (!order.getStatus().canTransitionTo(OrderStatus.CANCELLED)) {
            throw new InvalidStatusTransitionException("Cannot cancel order from " + order.getStatus());
        }

        // Release each reserved quantity once. The locked order prevents duplicate releases.
        for (PharmacyOrderItem item : order.getItems()) {
            MedicineInventory inventory = inventoryRepository.findByPharmacyIdAndMedicineId(order.getPharmacy().getId(), item.getMedicineId())
                    .orElseThrow(() -> new InvalidStatusTransitionException("Reserved inventory record is missing for " + item.getMedicineName()));
            if (inventoryRepository.releaseReservedStock(inventory.getId(), item.getQuantity()) != 1) {
                throw new InvalidStatusTransitionException("Reserved stock is inconsistent for " + item.getMedicineName());
            }
        }

        order.setStatus(OrderStatus.CANCELLED);
        PharmacyOrder saved = orderRepository.save(order);
        return mapToOrderResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> getPatientOrders(Long patientId) {
        return orderRepository.findByPatientIdOrderByCreatedAtDesc(patientId).stream()
                .map(this::mapToOrderResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> getPharmacyOrders(Long pharmacyId) {
        return orderRepository.findByPharmacyIdOrderByCreatedAtDesc(pharmacyId).stream()
                .map(this::mapToOrderResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public OrderResponse getOrderById(Long orderId, Long userId, boolean pharmacyUser) {
        PharmacyOrder order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id " + orderId));

        Long ownerId = pharmacyUser ? order.getPharmacy().getOwnerUserId() : order.getPatientId();
        if (userId == null || !java.util.Objects.equals(ownerId, userId)) {
            throw new UnauthorizedException("You do not have permission to access this order");
        }

        return mapToOrderResponse(order);
    }

    private PharmacyOrder getOrderAndValidatePharmacy(Long orderId, Long pharmacyId) {
        PharmacyOrder order = orderRepository.findByIdForUpdate(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id " + orderId));

        if (!order.getPharmacy().getId().equals(pharmacyId)) {
            throw new UnauthorizedException("Pharmacy ID does not match order pharmacy");
        }

        return order;
    }

    private OrderResponse transitionOrder(Long orderId, Long pharmacyId, OrderStatus target) {
        PharmacyOrder order = getOrderAndValidatePharmacy(orderId, pharmacyId);
        if (!order.getStatus().canTransitionTo(target)) {
            throw new InvalidStatusTransitionException("Cannot transition order from " + order.getStatus() + " to " + target);
        }
        order.setStatus(target);
        PharmacyOrder saved = orderRepository.save(order);
        if (target == OrderStatus.PROCESSING) {
            publishOrderNotification("PHARMACY_ORDER_CONFIRMED", saved,
                    "Order confirmed", "Your pharmacy has confirmed your order.");
        }
        return mapToOrderResponse(saved);
    }

    private void publishOrderNotification(String eventType, PharmacyOrder order, String title, String body) {
        if (notificationEventPublisher != null) {
            notificationEventPublisher.publish(NotificationEvent.now(eventType, order.getPatientId(), title, body,
                    java.util.Map.of("orderId", order.getId().toString())));
        }
    }

    private boolean samePrescribedMedicine(String prescribedName, String inventoryName) {
        if (prescribedName == null || inventoryName == null) return false;
        String prescribed = prescribedName.toLowerCase().replaceAll("[^a-z0-9]", "");
        String inStock = inventoryName.toLowerCase().replaceAll("[^a-z0-9]", "");
        return !prescribed.isBlank() && !inStock.isBlank()
                && (prescribed.equals(inStock) || prescribed.startsWith(inStock) || inStock.startsWith(prescribed));
    }

    private OrderStatus normalizeLegacyStatus(OrderStatus status) {
        return status == OrderStatus.CONFIRMED || status == OrderStatus.PREPARING ? OrderStatus.PROCESSING : status;
    }

    private PharmacyResponse mapToPharmacyResponse(Pharmacy pharmacy) {
        return PharmacyResponse.builder()
                .id(pharmacy.getId())
                .name(pharmacy.getName())
                .licenseNumber(pharmacy.getLicenseNumber())
                .address(pharmacy.getAddress())
                .phone(pharmacy.getPhone())
                .email(pharmacy.getEmail())
                .status(pharmacy.getStatus())
                .createdAt(pharmacy.getCreatedAt())
                .build();
    }

    private InventoryResponse mapToInventoryResponse(MedicineInventory inventory) {
        return InventoryResponse.builder()
                .id(inventory.getId())
                .pharmacyId(inventory.getPharmacy().getId())
                .medicineId(inventory.getMedicineId())
                .medicineName(inventory.getMedicineName())
                .availableQuantity(inventory.getAvailableQuantity())
                .reservedQuantity(inventory.getReservedQuantity())
                .price(inventory.getPrice())
                .active(inventory.isActive())
                .build();
    }

    private OrderResponse mapToOrderResponse(PharmacyOrder order) {
        return OrderResponse.builder()
                .id(order.getId())
                .patientId(order.getPatientId())
                .pharmacyId(order.getPharmacy().getId())
                .pharmacyName(order.getPharmacy().getName())
                .prescriptionId(order.getPrescriptionId())
                .status(normalizeLegacyStatus(order.getStatus()))
                .totalAmount(order.getTotalAmount())
                .deliveryAddress(order.getDeliveryAddress())
                .createdAt(order.getCreatedAt())
                .deliveredAt(order.getStatus() == OrderStatus.DELIVERED ? order.getUpdatedAt() : null)
                .items(order.getItems().stream().map(this::mapItemToResponse).collect(Collectors.toList()))
                .build();
    }

    private OrderItemResponse mapItemToResponse(PharmacyOrderItem item) {
        return OrderItemResponse.builder()
                .id(item.getId())
                .medicineId(item.getMedicineId())
                .medicineName(item.getMedicineName())
                .quantity(item.getQuantity())
                .unitPrice(item.getUnitPrice())
                .totalPrice(item.getTotalPrice())
                .build();
    }
}
