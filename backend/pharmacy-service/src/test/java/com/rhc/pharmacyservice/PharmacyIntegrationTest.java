package com.rhc.pharmacyservice;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rhc.pharmacyservice.client.PrescriptionClient;
import com.rhc.pharmacyservice.dto.*;
import com.rhc.pharmacyservice.entity.MedicineInventory;
import com.rhc.pharmacyservice.entity.Pharmacy;
import com.rhc.pharmacyservice.exception.InsufficientStockException;
import com.rhc.pharmacyservice.exception.PharmacyProviderUnavailableException;
import com.rhc.pharmacyservice.provider.NearbyPharmacyProvider;
import com.rhc.pharmacyservice.repository.MedicineInventoryRepository;
import com.rhc.pharmacyservice.repository.PharmacyOrderRepository;
import com.rhc.pharmacyservice.repository.PharmacyRepository;
import com.rhc.pharmacyservice.service.PharmacyService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.math.BigDecimal;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
public class PharmacyIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private PharmacyService pharmacyService;

    @Autowired
    private PharmacyRepository pharmacyRepository;

    @Autowired
    private MedicineInventoryRepository inventoryRepository;

    @Autowired
    private PharmacyOrderRepository orderRepository;

    @MockBean
    private PrescriptionClient prescriptionClient;

    @MockBean
    private NearbyPharmacyProvider nearbyPharmacyProvider;

    private PrescriptionResponse rxResponse;
    private OrderCreateRequest orderRequest;

    @BeforeEach
    void setUp() {
        // The development seed has no owner; assign one only for lifecycle authorization tests.
        Pharmacy pharmacy = pharmacyRepository.findById(1L).orElseThrow();
        pharmacy.setOwnerUserId(1L);
        pharmacyRepository.save(pharmacy);

        PrescriptionItemResponse item = PrescriptionItemResponse.builder()
                .id(1L)
                .medicineName("Paracetamol 500mg")
                .build();

        rxResponse = PrescriptionResponse.builder()
                .id(100L)
                .patientId(10L)
                .status("FINALIZED")
                .items(List.of(item))
                .build();

        OrderItemRequest orderItem = OrderItemRequest.builder()
                .medicineId(1L)
                .medicineName("Paracetamol 500mg")
                .quantity(5)
                .unitPrice(new BigDecimal("15.50"))
                .build();

        orderRequest = OrderCreateRequest.builder()
                .prescriptionId(100L)
                .pharmacyId(1L)
                .deliveryAddress("Village Sector 4")
                .items(List.of(orderItem))
                .build();
    }

    @Test
    void testFullPharmacyOrderLifecycle() throws Exception {
        // Mock Feign Client
        when(prescriptionClient.getPrescriptionById(100L)).thenReturn(rxResponse);

        // 1. Get active pharmacies (DataInitializer seeds Pharmacy #1)
        mockMvc.perform(get("/api/pharmacy/pharmacies"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("Green Valley Rural Pharmacy"));

        // 2. Create Order
        MvcResult result = mockMvc.perform(post("/api/pharmacy/orders")
                .requestAttr("userId", 10L)
                .requestAttr("roles", List.of("PATIENT"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(orderRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PLACED"))
                .andExpect(jsonPath("$.prescriptionId").value(100))
                .andReturn();

        String jsonStr = result.getResponse().getContentAsString();
        Long orderId = objectMapper.readTree(jsonStr).get("id").asLong();

        mockMvc.perform(get("/api/pharmacy/orders/" + orderId)
                        .requestAttr("userId", 2L)
                        .requestAttr("roles", List.of("PHARMACY")))
                .andExpect(status().isForbidden());
        mockMvc.perform(patch("/api/pharmacy/orders/" + orderId + "/processing")
                        .requestAttr("userId", 2L)
                        .requestAttr("roles", List.of("PHARMACY")))
                .andExpect(status().isForbidden());

        MedicineInventory reservedInventory = inventoryRepository.findByPharmacyIdAndMedicineId(1L, 1L).orElseThrow();
        assertEquals(95, reservedInventory.getAvailableQuantity());
        assertEquals(5, reservedInventory.getReservedQuantity());

        // 3. Pharmacy accepts the order and starts processing it.
        mockMvc.perform(patch("/api/pharmacy/orders/" + orderId + "/processing")
                        .requestAttr("userId", 1L)
                        .requestAttr("roles", List.of("PHARMACY")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PROCESSING"));

        // Patient and pharmacy order feeds expose the same persisted state.
        String patientOrders = mockMvc.perform(get("/api/pharmacy/orders/patient")
                        .requestAttr("userId", 10L)
                        .requestAttr("roles", List.of("PATIENT")))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        String pharmacyOrders = mockMvc.perform(get("/api/pharmacy/orders/pharmacy/1")
                        .requestAttr("userId", 1L)
                        .requestAttr("roles", List.of("PHARMACY")))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertEquals("PROCESSING", findOrderStatus(patientOrders, orderId));
        assertEquals(findOrderStatus(patientOrders, orderId), findOrderStatus(pharmacyOrders, orderId));

        // 5. Pharmacy Marks Ready
        mockMvc.perform(patch("/api/pharmacy/orders/" + orderId + "/ready")
                        .requestAttr("userId", 1L)
                        .requestAttr("roles", List.of("PHARMACY")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("READY"));

        // 6. Pharmacy dispatches the order, then confirms delivery.
        mockMvc.perform(patch("/api/pharmacy/orders/" + orderId + "/dispatched")
                        .requestAttr("userId", 1L)
                        .requestAttr("roles", List.of("PHARMACY")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("DISPATCHED"));

        mockMvc.perform(patch("/api/pharmacy/orders/" + orderId + "/delivered")
                        .requestAttr("userId", 1L)
                        .requestAttr("roles", List.of("PHARMACY")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("DELIVERED"))
                .andExpect(jsonPath("$.deliveredAt").isNotEmpty());
        MedicineInventory deliveredInventory = inventoryRepository.findByPharmacyIdAndMedicineId(1L, 1L).orElseThrow();
        assertEquals(95, deliveredInventory.getAvailableQuantity());
        assertEquals(0, deliveredInventory.getReservedQuantity());

        // 7. Cannot cancel DELIVERED order
        mockMvc.perform(patch("/api/pharmacy/orders/" + orderId + "/cancel")
                .requestAttr("userId", 10L)
                .requestAttr("roles", List.of("PATIENT")))
                .andExpect(status().isBadRequest());
    }

    @Test
    void concurrentOrderCreationCannotReserveTheSameLastUnitTwice() throws Exception {
        long medicineId = 987654321L;
        long prescriptionAId = 987654321L;
        long prescriptionBId = 987654322L;
        Pharmacy pharmacy = pharmacyRepository.findById(1L).orElseThrow();
        MedicineInventory stock = inventoryRepository.save(MedicineInventory.builder()
                .pharmacy(pharmacy)
                .medicineId(medicineId)
                .medicineName("Concurrency Test Medicine 500mg")
                .availableQuantity(1)
                .reservedQuantity(0)
                .price(new BigDecimal("22.50"))
                .active(true)
                .build());
        PrescriptionResponse prescriptionA = PrescriptionResponse.builder()
                .id(prescriptionAId)
                .patientId(10L)
                .status("FINALIZED")
                .items(List.of(PrescriptionItemResponse.builder()
                        .id(1L)
                        .medicineName("Concurrency Test Medicine 500mg")
                        .build()))
                .build();
        PrescriptionResponse prescriptionB = PrescriptionResponse.builder()
                .id(prescriptionBId)
                .patientId(20L)
                .status("FINALIZED")
                .items(List.of(PrescriptionItemResponse.builder()
                        .id(2L)
                        .medicineName("Concurrency Test Medicine 500mg")
                        .build()))
                .build();
        when(prescriptionClient.getPrescriptionById(prescriptionAId)).thenReturn(prescriptionA);
        when(prescriptionClient.getPrescriptionById(prescriptionBId)).thenReturn(prescriptionB);
        OrderCreateRequest requestA = OrderCreateRequest.builder()
                .prescriptionId(prescriptionAId)
                .pharmacyId(1L)
                .deliveryAddress("Village Sector 4")
                .items(List.of(OrderItemRequest.builder()
                        .medicineId(medicineId)
                        .medicineName("Concurrency Test Medicine 500mg")
                        .quantity(1)
                        .unitPrice(new BigDecimal("0.01"))
                        .build()))
                .build();
        OrderCreateRequest requestB = OrderCreateRequest.builder()
                .prescriptionId(prescriptionBId)
                .pharmacyId(1L)
                .deliveryAddress("Village Sector 4")
                .items(List.of(OrderItemRequest.builder()
                        .medicineId(medicineId)
                        .medicineName("Concurrency Test Medicine 500mg")
                        .quantity(1)
                        .unitPrice(new BigDecimal("0.01"))
                        .build()))
                .build();

        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);
        ExecutorService workers = Executors.newFixedThreadPool(2);
        try {
            Future<Boolean> patientA = workers.submit(() -> attemptOrder(10L, ready, start, requestA));
            Future<Boolean> patientB = workers.submit(() -> attemptOrder(20L, ready, start, requestB));
            assertTrue(ready.await(5, TimeUnit.SECONDS), "Both order requests should reach the start gate");
            start.countDown();

            boolean patientASucceeded = patientA.get(10, TimeUnit.SECONDS);
            boolean patientBSucceeded = patientB.get(10, TimeUnit.SECONDS);
            assertNotEquals(patientASucceeded, patientBSucceeded, "Exactly one patient should reserve the last unit");
        } finally {
            start.countDown();
            workers.shutdownNow();
        }

        MedicineInventory remaining = inventoryRepository.findById(stock.getId()).orElseThrow();
        assertEquals(0, remaining.getAvailableQuantity());
        assertEquals(1, remaining.getReservedQuantity());
        assertTrue(remaining.getAvailableQuantity() >= 0, "Inventory must never become negative");
        long createdOrders = orderRepository.findAll().stream()
                .filter(order -> order.getPrescriptionId().equals(prescriptionAId) || order.getPrescriptionId().equals(prescriptionBId))
                .count();
        assertEquals(1, createdOrders, "Only the successful reservation should create an order");
    }

    private boolean attemptOrder(Long patientId, CountDownLatch ready, CountDownLatch start, OrderCreateRequest request) throws Exception {
        ready.countDown();
        if (!start.await(5, TimeUnit.SECONDS)) throw new IllegalStateException("Concurrent order start timed out");
        try {
            pharmacyService.createOrder(patientId, request);
            return true;
        } catch (InsufficientStockException expected) {
            return false;
        }
    }

    private String findOrderStatus(String json, Long orderId) throws Exception {
        for (var order : objectMapper.readTree(json)) {
            if (order.get("id").asLong() == orderId) return order.get("status").asText();
        }
        fail("Order #" + orderId + " was missing from an order dashboard response");
        return null;
    }

    @Test
    void nearbyEndpointReturnsProviderData() throws Exception {
        NearbyPharmacyResponse result = NearbyPharmacyResponse.builder()
                .id("osm:node:123")
                .name("Provider Pharmacy")
                .address("Main Street")
                .distanceMeters(250.5)
                .openStatus("OPEN")
                .latitude(17.385)
                .longitude(78.4867)
                .build();
        when(nearbyPharmacyProvider.findNearby(anyDouble(), anyDouble(), anyInt())).thenReturn(List.of(result));

        mockMvc.perform(get("/api/pharmacy/nearby")
                        .param("latitude", "17.385")
                        .param("longitude", "78.4867"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value("osm:node:123"))
                .andExpect(jsonPath("$[0].name").value("Provider Pharmacy"))
                .andExpect(jsonPath("$[0].distanceMeters").value(250.5))
                .andExpect(jsonPath("$[0].openStatus").value("OPEN"));
    }

    @Test
    void nearbyEndpointPreservesEmptyResults() throws Exception {
        when(nearbyPharmacyProvider.findNearby(anyDouble(), anyDouble(), anyInt())).thenReturn(List.of());

        mockMvc.perform(get("/api/pharmacy/nearby")
                        .param("latitude", "17.385")
                        .param("longitude", "78.4867"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    void nearbyEndpointReportsProviderUnavailable() throws Exception {
        when(nearbyPharmacyProvider.findNearby(anyDouble(), anyDouble(), anyInt()))
                .thenThrow(new PharmacyProviderUnavailableException("provider unavailable"));

        mockMvc.perform(get("/api/pharmacy/nearby")
                        .param("latitude", "17.385")
                        .param("longitude", "78.4867"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.message").value("provider unavailable"));
    }

    @Test
    void nearbyEndpointRejectsInvalidCoordinates() throws Exception {
        mockMvc.perform(get("/api/pharmacy/nearby")
                        .param("latitude", "91")
                        .param("longitude", "78.4867"))
                .andExpect(status().isBadRequest());
    }
}
