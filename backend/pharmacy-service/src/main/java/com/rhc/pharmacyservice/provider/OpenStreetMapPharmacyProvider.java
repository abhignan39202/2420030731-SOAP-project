package com.rhc.pharmacyservice.provider;

import com.fasterxml.jackson.databind.JsonNode;
import com.rhc.pharmacyservice.dto.NearbyPharmacyResponse;
import com.rhc.pharmacyservice.exception.PharmacyProviderUnavailableException;
import org.springframework.http.MediaType;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import lombok.extern.slf4j.Slf4j;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.StringJoiner;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

/** OpenStreetMap Overpass implementation. It does not require a browser-visible API key. */
@Slf4j
public class OpenStreetMapPharmacyProvider implements NearbyPharmacyProvider {
    private final RestClient restClient;
    private final String endpoint;
    private final String fallbackEndpoint;

    public OpenStreetMapPharmacyProvider(RestClient restClient, String endpoint) {
        this(restClient, endpoint, null);
    }

    public OpenStreetMapPharmacyProvider(RestClient restClient, String endpoint, String fallbackEndpoint) {
        this.restClient = restClient;
        this.endpoint = endpoint;
        this.fallbackEndpoint = fallbackEndpoint;
    }

    @Override
    public List<NearbyPharmacyResponse> findNearby(double latitude, double longitude, int radiusMeters) {
        String query = "[out:json][timeout:15];nwr[\"amenity\"=\"pharmacy\"](around:"
                + radiusMeters + "," + latitude + "," + longitude + ");out center tags;";
        List<String> endpoints = new ArrayList<>();
        if (endpoint != null && !endpoint.isBlank()) endpoints.add(endpoint);
        if (fallbackEndpoint != null && !fallbackEndpoint.isBlank() && !fallbackEndpoint.equals(endpoint)) {
            endpoints.add(fallbackEndpoint);
        }
        RuntimeException lastFailure = null;
        for (String providerEndpoint : endpoints) {
            try {
                JsonNode root = restClient.post()
                        .uri(providerEndpoint)
                        .header("User-Agent", "rural-health-companion-pharmacy-discovery/1.0")
                        .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                        .body("data=" + URLEncoder.encode(query, StandardCharsets.UTF_8))
                        .retrieve()
                        .body(JsonNode.class);
                return parseResults(root, latitude, longitude, radiusMeters);
            } catch (RestClientException | IllegalArgumentException ex) {
                lastFailure = ex;
                if (ex instanceof RestClientResponseException responseError) {
                    log.warn("Nearby Overpass endpoint {} returned HTTP {}", providerEndpoint, responseError.getStatusCode().value());
                } else {
                    log.warn("Nearby Overpass endpoint {} failed: {}", providerEndpoint, ex.getClass().getSimpleName());
                }
            }
        }
        throw new PharmacyProviderUnavailableException("Nearby pharmacy search is temporarily unavailable. Please try again.", lastFailure);
    }

    private List<NearbyPharmacyResponse> parseResults(JsonNode root, double latitude, double longitude, int radiusMeters) {
        if (root == null || !root.path("elements").isArray()) {
            throw new IllegalArgumentException("Overpass response did not contain a pharmacy result list");
        }
        List<NearbyPharmacyResponse> results = new ArrayList<>();
        for (JsonNode element : root.path("elements")) {
            double resultLatitude = coordinate(element, "lat", "center", "lat");
            double resultLongitude = coordinate(element, "lon", "center", "lon");
            if (!Double.isFinite(resultLatitude) || !Double.isFinite(resultLongitude)) {
                continue;
            }
            double distance = ProviderGeoUtils.distanceMeters(latitude, longitude, resultLatitude, resultLongitude);
            if (distance > radiusMeters) {
                continue;
            }
            JsonNode tags = element.path("tags");
            String name = text(tags, "name");
            if (name.isBlank()) {
                name = "Pharmacy";
            }
            results.add(NearbyPharmacyResponse.builder()
                    .id("osm:" + text(element, "type") + ":" + text(element, "id"))
                    .name(name)
                    .address(address(tags))
                    .distanceMeters(Math.round(distance * 10.0) / 10.0)
                    .openStatus(openStatus(text(tags, "opening_hours")))
                    .latitude(resultLatitude)
                    .longitude(resultLongitude)
                    .build());
        }
        results.sort(Comparator.comparing(NearbyPharmacyResponse::getDistanceMeters));
        return results;
    }

    private double coordinate(JsonNode element, String directField, String container, String nestedField) {
        if (element.has(directField)) {
            return element.path(directField).asDouble(Double.NaN);
        }
        return element.path(container).path(nestedField).asDouble(Double.NaN);
    }

    private String address(JsonNode tags) {
        StringJoiner joiner = new StringJoiner(", ");
        addIfPresent(joiner, text(tags, "addr:housenumber"));
        addIfPresent(joiner, text(tags, "addr:street"));
        addIfPresent(joiner, text(tags, "addr:city"));
        addIfPresent(joiner, text(tags, "addr:postcode"));
        return joiner.toString();
    }

    private void addIfPresent(StringJoiner joiner, String value) {
        if (!value.isBlank()) {
            joiner.add(value);
        }
    }

    private String text(JsonNode node, String field) {
        JsonNode value = node == null ? null : node.get(field);
        return value == null || value.isNull() ? "" : value.asText("");
    }

    private String openStatus(String openingHours) {
        if (openingHours.isBlank()) {
            return "UNKNOWN";
        }
        String normalized = openingHours.replace(" ", "").toUpperCase();
        if (normalized.equals("24/7") || normalized.contains("00:00-24:00")) {
            return "OPEN";
        }
        return "UNKNOWN";
    }
}
