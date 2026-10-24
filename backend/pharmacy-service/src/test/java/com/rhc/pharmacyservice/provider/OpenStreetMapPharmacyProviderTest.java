package com.rhc.pharmacyservice.provider;

import com.rhc.pharmacyservice.dto.NearbyPharmacyResponse;
import com.rhc.pharmacyservice.exception.PharmacyProviderUnavailableException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class OpenStreetMapPharmacyProviderTest {
    private static final String ENDPOINT = "https://overpass.example/api/interpreter";
    private static final String FALLBACK_ENDPOINT = "https://overpass-backup.example/api/interpreter";

    private MockRestServiceServer server;
    private OpenStreetMapPharmacyProvider provider;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        provider = new OpenStreetMapPharmacyProvider(builder.build(), ENDPOINT);
    }

    @Test
    void mapsProviderPharmacyFieldsAndDistance() {
        server.expect(requestTo(ENDPOINT))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess("""
                        {"elements":[{"type":"node","id":42,"lat":17.3851,"lon":78.4868,
                        "tags":{"name":"Mapped Pharmacy","addr:street":"Main Road","opening_hours":"24/7"}}]}
                        """, MediaType.APPLICATION_JSON));

        List<NearbyPharmacyResponse> results = provider.findNearby(17.385, 78.4867, 1000);

        assertEquals(1, results.size());
        assertEquals("osm:node:42", results.get(0).getId());
        assertEquals("Mapped Pharmacy", results.get(0).getName());
        assertEquals("Main Road", results.get(0).getAddress());
        assertEquals("OPEN", results.get(0).getOpenStatus());
        server.verify();
    }

    @Test
    void returnsEmptyWhenProviderReturnsNoElements() {
        server.expect(requestTo(ENDPOINT))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess("{\"elements\":[]}", MediaType.APPLICATION_JSON));

        assertEquals(List.of(), provider.findNearby(17.385, 78.4867, 1000));
        server.verify();
    }

    @Test
    void translatesProviderFailure() {
        server.expect(requestTo(ENDPOINT))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withServerError());

        assertThrows(PharmacyProviderUnavailableException.class,
                () -> provider.findNearby(17.385, 78.4867, 1000));
        server.verify();
    }

    @Test
    void usesSecondRealProviderWhenPrimaryIsUnavailable() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer fallbackServer = MockRestServiceServer.bindTo(builder).build();
        OpenStreetMapPharmacyProvider redundantProvider =
                new OpenStreetMapPharmacyProvider(builder.build(), ENDPOINT, FALLBACK_ENDPOINT);
        fallbackServer.expect(requestTo(ENDPOINT))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withServerError());
        fallbackServer.expect(requestTo(FALLBACK_ENDPOINT))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess("""
                        {"elements":[{"type":"node","id":43,"lat":17.3851,"lon":78.4868,
                        "tags":{"name":"Fallback Pharmacy"}}]}
                        """, MediaType.APPLICATION_JSON));

        List<NearbyPharmacyResponse> results = redundantProvider.findNearby(17.385, 78.4867, 1000);

        assertEquals(1, results.size());
        assertEquals("Fallback Pharmacy", results.get(0).getName());
        fallbackServer.verify();
    }
}
