package com.rhc.pharmacyservice.provider;

import com.fasterxml.jackson.databind.JsonNode;
import com.rhc.pharmacyservice.dto.NearbyPharmacyResponse;
import com.rhc.pharmacyservice.exception.PharmacyProviderUnavailableException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

public class GooglePlacesPharmacyProvider implements NearbyPharmacyProvider {
    private final RestClient restClient;
    private final String endpoint;
    private final String apiKey;

    public GooglePlacesPharmacyProvider(RestClient restClient, String endpoint, String apiKey) {
        this.restClient = restClient;
        this.endpoint = endpoint;
        this.apiKey = apiKey;
    }

    @Override
    public List<NearbyPharmacyResponse> findNearby(double latitude, double longitude, int radiusMeters) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new PharmacyProviderUnavailableException("Google Places API key is not configured");
        }
        try {
            JsonNode root = restClient.get()
                    .uri(UriComponentsBuilder.fromUriString(endpoint)
                            .queryParam("location", latitude + "," + longitude)
                            .queryParam("radius", radiusMeters)
                            .queryParam("type", "pharmacy")
                            .queryParam("key", apiKey)
                            .build()
                            .encode()
                            .toUri())
                    .retrieve()
                    .body(JsonNode.class);
            String status = root == null ? "" : root.path("status").asText("");
            if (!status.isBlank() && !status.equals("OK") && !status.equals("ZERO_RESULTS")) {
                throw new PharmacyProviderUnavailableException("Google Places returned status " + status);
            }
            return parseResults(root, latitude, longitude, radiusMeters);
        } catch (RestClientException | IllegalArgumentException ex) {
            throw new PharmacyProviderUnavailableException("Nearby pharmacy provider unavailable", ex);
        }
    }

    private List<NearbyPharmacyResponse> parseResults(JsonNode root, double latitude, double longitude, int radiusMeters) {
        if (root == null || !root.has("results")) {
            return List.of();
        }
        List<NearbyPharmacyResponse> results = new ArrayList<>();
        for (JsonNode place : root.path("results")) {
            double resultLatitude = place.path("geometry").path("location").path("lat").asDouble(Double.NaN);
            double resultLongitude = place.path("geometry").path("location").path("lng").asDouble(Double.NaN);
            if (!Double.isFinite(resultLatitude) || !Double.isFinite(resultLongitude)) {
                continue;
            }
            double distance = ProviderGeoUtils.distanceMeters(latitude, longitude, resultLatitude, resultLongitude);
            if (distance > radiusMeters) {
                continue;
            }
            String status = place.path("opening_hours").has("open_now")
                    ? (place.path("opening_hours").path("open_now").asBoolean() ? "OPEN" : "CLOSED")
                    : "UNKNOWN";
            if (place.path("business_status").asText("").equals("CLOSED_PERMANENTLY")) {
                status = "CLOSED";
            }
            results.add(NearbyPharmacyResponse.builder()
                    .id(place.path("place_id").asText(""))
                    .name(place.path("name").asText("Pharmacy"))
                    .address(place.path("formatted_address").asText(place.path("vicinity").asText("")))
                    .distanceMeters(Math.round(distance * 10.0) / 10.0)
                    .openStatus(status)
                    .latitude(resultLatitude)
                    .longitude(resultLongitude)
                    .build());
        }
        results.sort(Comparator.comparing(NearbyPharmacyResponse::getDistanceMeters));
        return results;
    }
}
