package com.rhc.pharmacyservice.service;

import com.rhc.pharmacyservice.client.PrescriptionClient;
import com.rhc.pharmacyservice.dto.*;
import com.rhc.pharmacyservice.entity.*;
import com.rhc.pharmacyservice.exception.*;
import com.rhc.pharmacyservice.repository.*;
import feign.FeignException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class PharmacyServiceTest {

    @Mock
    private PharmacyRepository pharmacyRepository;

    @Mock
    private MedicineInventoryRepository inventoryRepository;

    @Mock
    private PharmacyOrderRepository orderRepository;

    @Mock
    private PrescriptionClient prescriptionClient;

    @InjectMocks
    private PharmacyService pharmacyService;

    private Pharmacy activePharmacy;
    private MedicineInventory inventory;
    private PrescriptionResponse finalizedRx;
    private OrderCreateRequest validOrderRequest;
    private PharmacyOrder placedOrder;

    @BeforeEach
    void setUp() {
        activePharmacy = Pharmacy.builder()
                .id(1L)
                .name("Green Valley Pharmacy")
                .licenseNumber("LIC-100")
                .status(PharmacyStatus.ACTIVE)
                .build();

        inventory = MedicineInventory.builder()
                .id(10L)
                .pharmacy(activePharmacy)
                .medicineId(100L)
                .medicineName("Paracetamol")
                .availableQuantity(50)
                .reservedQuantity(0)
                .price(new BigDecimal("10.00"))
                .active(true)
                .build();

        PrescriptionItemResponse itemResponse = PrescriptionItemResponse.builder()
                .id(100L)
                .medicineName("Paracetamol")
                .build();

        finalizedRx = PrescriptionResponse.builder()
                .id(50L)
                .patientId(1000L)
                .status("FINALIZED")
                .items(List.of(itemResponse))
                .build();

        OrderItemRequest itemReq = OrderItemRequest.builder()
                .medicineId(100L)
                .medicineName("Paracetamol")
                .quantity(5)
                .unitPrice(new BigDecimal("0.01")) // Client price must be ignored in favor of inventory price.
                .build();

        validOrderRequest = OrderCreateRequest.builder()
                .prescriptionId(50L)
                .pharmacyId(1L)
                .deliveryAddress("Health Post")
                .items(List.of(itemReq))
                .build();

        PharmacyOrderItem orderItem = PharmacyOrderItem.builder()
                .id(1L)
                .medicineId(100L)
                .medicineName("Paracetamol")
                .quantity(5)
                .unitPrice(new BigDecimal("10.00"))
                .totalPrice(new BigDecimal("50.00"))
                .build();

        placedOrder = PharmacyOrder.builder()
                .id(500L)
                .patientId(1000L)
                .pharmacy(activePharmacy)
                .prescriptionId(50L)
                .status(OrderStatus.PLACED)
                .totalAmount(new BigDecimal("50.00"))
                .deliveryAddress("Health Post")
                .items(List.of(orderItem))
                .build();

        orderItem.setOrder(placedOrder);
    }

    // 1. Create order - success
    @Test
    void returnsEmptyListWhenNoActivePharmaciesExist() {
        when(pharmacyRepository.findByStatus(PharmacyStatus.ACTIVE)).thenReturn(List.of());
        assertEquals(List.of(), pharmacyService.getActivePharmacies());
    }

    @Test
    void returnsOnlyActivePharmacies() {
        when(pharmacyRepository.findByStatus(PharmacyStatus.ACTIVE)).thenReturn(List.of(activePharmacy));
        assertEquals(List.of("Green Valley Pharmacy"), pharmacyService.getActivePharmacies().stream()
                .map(PharmacyResponse::getName).toList());
    }

    @Test
    void testCreateOrderSuccess() {
        when(prescriptionClient.getPrescriptionById(50L)).thenReturn(finalizedRx);
        when(pharmacyRepository.findById(1L)).thenReturn(Optional.of(activePharmacy));
        when(inventoryRepository.findByPharmacyIdAndMedicineId(1L, 100L)).thenReturn(Optional.of(inventory));
        when(inventoryRepository.reserveAvailableStock(10L, 5)).thenReturn(1);
        when(orderRepository.save(any(PharmacyOrder.class))).thenAnswer(i -> {
            PharmacyOrder o = i.getArgument(0);
            o.setId(500L);
            return o;
        });

        OrderResponse response = pharmacyService.createOrder(1000L, validOrderRequest);

        assertNotNull(response);
        assertEquals(500L, response.getId());
        assertEquals(OrderStatus.PLACED, response.getStatus());
        assertEquals(new BigDecimal("50.00"), response.getItems().get(0).getTotalPrice());
        verify(inventoryRepository).reserveAvailableStock(10L, 5);
    }

    // 2. Reject - non finalized prescription
    @Test
    void testCreateOrderNonFinalizedRx() {
        finalizedRx.setStatus("DRAFT");
        when(prescriptionClient.getPrescriptionById(50L)).thenReturn(finalizedRx);

        assertThrows(InvalidStatusTransitionException.class, () ->
            pharmacyService.createOrder(1000L, validOrderRequest)
        );
    }

    // 3. Reject - prescription belongs to another patient
    @Test
    void testCreateOrderWrongPatient() {
        when(prescriptionClient.getPrescriptionById(50L)).thenReturn(finalizedRx);

        assertThrows(UnauthorizedException.class, () ->
            pharmacyService.createOrder(2000L, validOrderRequest)
        );
    }

    @Test
    void testCreateOrderRejectsPrescriptionServiceForbidden() {
        FeignException forbidden = mock(FeignException.class);
        when(forbidden.status()).thenReturn(403);
        when(prescriptionClient.getPrescriptionById(50L)).thenThrow(forbidden);

        assertThrows(UnauthorizedException.class, () ->
            pharmacyService.createOrder(1000L, validOrderRequest));
        verifyNoInteractions(orderRepository);
    }

    // 4. Reject - medicine not in prescription
    @Test
    void testCreateOrderMedicineNotInRx() {
        finalizedRx.setItems(List.of());
        when(prescriptionClient.getPrescriptionById(50L)).thenReturn(finalizedRx);
        when(pharmacyRepository.findById(1L)).thenReturn(Optional.of(activePharmacy));
        when(inventoryRepository.findByPharmacyIdAndMedicineId(1L, 100L)).thenReturn(Optional.of(inventory));

        assertThrows(InvalidStatusTransitionException.class, () ->
            pharmacyService.createOrder(1000L, validOrderRequest)
        );
    }

    // 5. Reject - insufficient stock
    @Test
    void testCreateOrderInsufficientStock() {
        inventory.setAvailableQuantity(2);
        when(prescriptionClient.getPrescriptionById(50L)).thenReturn(finalizedRx);
        when(pharmacyRepository.findById(1L)).thenReturn(Optional.of(activePharmacy));
        when(inventoryRepository.findByPharmacyIdAndMedicineId(1L, 100L)).thenReturn(Optional.of(inventory));

        assertThrows(InsufficientStockException.class, () ->
            pharmacyService.createOrder(1000L, validOrderRequest)
        );
    }

    // 6. Confirm order - success
    @Test
    void testConfirmOrderSuccess() {
        when(orderRepository.findByIdForUpdate(500L)).thenReturn(Optional.of(placedOrder));
        when(orderRepository.save(any())).thenReturn(placedOrder);

        OrderResponse response = pharmacyService.confirmOrder(500L, 1L);

        assertEquals(OrderStatus.PROCESSING, response.getStatus());
    }

    // 7. Transition workflow: CONFIRMED -> PREPARING -> READY -> DELIVERED
    @Test
    void testOrderFullLifecycle() {
        when(orderRepository.findByIdForUpdate(500L)).thenReturn(Optional.of(placedOrder));
        when(orderRepository.save(any())).thenAnswer(i -> i.getArgument(0));
        when(orderRepository.saveAndFlush(any())).thenAnswer(i -> i.getArgument(0));

        // PLACED -> PROCESSING
        pharmacyService.confirmOrder(500L, 1L);
        assertEquals(OrderStatus.PROCESSING, placedOrder.getStatus());

        // PROCESSING -> READY
        pharmacyService.setReady(500L, 1L);
        assertEquals(OrderStatus.READY, placedOrder.getStatus());

        // READY -> DISPATCHED -> DELIVERED
        pharmacyService.setDispatched(500L, 1L);
        assertEquals(OrderStatus.DISPATCHED, placedOrder.getStatus());
        when(inventoryRepository.findByPharmacyIdAndMedicineId(1L, 100L)).thenReturn(Optional.of(inventory));
        when(inventoryRepository.consumeReservedStock(10L, 5)).thenReturn(1);
        pharmacyService.setDelivered(500L, 1L);
        assertEquals(OrderStatus.DELIVERED, placedOrder.getStatus());
    }

    // 8. Cancel order - releases reserved stock
    @Test
    void testCancelOrderReleasesStock() {
        inventory.setAvailableQuantity(45);
        inventory.setReservedQuantity(5);

        when(orderRepository.findByIdForUpdate(500L)).thenReturn(Optional.of(placedOrder));
        when(inventoryRepository.findByPharmacyIdAndMedicineId(1L, 100L)).thenReturn(Optional.of(inventory));
        when(inventoryRepository.releaseReservedStock(10L, 5)).thenReturn(1);
        when(orderRepository.save(any())).thenReturn(placedOrder);

        OrderResponse response = pharmacyService.cancelOrder(500L, 1000L, false);

        assertEquals(OrderStatus.CANCELLED, response.getStatus());
        verify(inventoryRepository).releaseReservedStock(10L, 5);
    }

    // 9. Reject cancel on DELIVERED order
    @Test
    void testRejectCancelDeliveredOrder() {
        placedOrder.setStatus(OrderStatus.DELIVERED);
        when(orderRepository.findByIdForUpdate(500L)).thenReturn(Optional.of(placedOrder));

        assertThrows(InvalidStatusTransitionException.class, () ->
            pharmacyService.cancelOrder(500L, 1000L, false)
        );
    }
}
