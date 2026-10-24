package com.rhc.pharmacyservice.service;

import com.rhc.pharmacyservice.dto.NearbyPharmacyResponse;
import com.rhc.pharmacyservice.exception.InvalidLocationException;
import com.rhc.pharmacyservice.exception.PharmacyProviderUnavailableException;
import com.rhc.pharmacyservice.provider.NearbyPharmacyProvider;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NearbyPharmacyDiscoveryServiceTest {
    @Mock
    private NearbyPharmacyProvider provider;

    @InjectMocks
    private NearbyPharmacyDiscoveryService discoveryService;

    @Test
    void returnsProviderResultsWithoutCreatingLocalFallbacks() {
        NearbyPharmacyResponse result = NearbyPharmacyResponse.builder()
                .id("osm:node:1")
                .name("A real provider result")
                .distanceMeters(125.0)
                .openStatus("OPEN")
                .latitude(17.385)
                .longitude(78.4867)
                .build();
        when(provider.findNearby(anyDouble(), anyDouble(), anyInt())).thenReturn(List.of(result));

        List<NearbyPharmacyResponse> response = discoveryService.findNearby(17.385, 78.4867, 1000);

        assertEquals(List.of(result), response);
    }

    @Test
    void preservesEmptyProviderResults() {
        when(provider.findNearby(anyDouble(), anyDouble(), anyInt())).thenReturn(List.of());

        assertEquals(List.of(), discoveryService.findNearby(17.385, 78.4867, 1000));
    }

    @Test
    void exposesProviderUnavailable() {
        when(provider.findNearby(anyDouble(), anyDouble(), anyInt()))
                .thenThrow(new PharmacyProviderUnavailableException("provider unavailable"));

        assertThrows(PharmacyProviderUnavailableException.class,
                () -> discoveryService.findNearby(17.385, 78.4867, 1000));
    }

    @Test
    void rejectsInvalidCoordinates() {
        assertThrows(InvalidLocationException.class,
                () -> discoveryService.findNearby(91, 78.4867, 1000));
        assertThrows(InvalidLocationException.class,
                () -> discoveryService.findNearby(17.385, 181, 1000));
    }
}
