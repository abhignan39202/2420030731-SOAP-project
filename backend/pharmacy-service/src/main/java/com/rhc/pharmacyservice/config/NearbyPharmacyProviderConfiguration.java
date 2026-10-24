package com.rhc.pharmacyservice.config;

import com.rhc.pharmacyservice.provider.GooglePlacesPharmacyProvider;
import com.rhc.pharmacyservice.provider.NearbyPharmacyProvider;
import com.rhc.pharmacyservice.provider.OpenStreetMapPharmacyProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import java.time.Duration;

@Configuration
public class NearbyPharmacyProviderConfiguration {

    @Bean
    public NearbyPharmacyProvider nearbyPharmacyProvider(
            @Value("${nearby.pharmacy.provider:osm}") String provider,
            @Value("${nearby.pharmacy.osm.endpoint:https://overpass-api.de/api/interpreter}") String osmEndpoint,
            @Value("${nearby.pharmacy.osm.fallback-endpoint:https://lz4.overpass-api.de/api/interpreter}") String osmFallbackEndpoint,
            @Value("${nearby.pharmacy.google.endpoint:https://maps.googleapis.com/maps/api/place/nearbysearch/json}") String googleEndpoint,
            @Value("${nearby.pharmacy.google.api-key:}") String googleApiKey) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(5));
        requestFactory.setReadTimeout(Duration.ofSeconds(18));
        RestClient restClient = RestClient.builder().requestFactory(requestFactory).build();
        return switch (provider.trim().toLowerCase()) {
            case "osm", "openstreetmap" -> new OpenStreetMapPharmacyProvider(restClient, osmEndpoint, osmFallbackEndpoint);
            case "google", "google-places" -> new GooglePlacesPharmacyProvider(restClient, googleEndpoint, googleApiKey);
            default -> throw new IllegalStateException("Unsupported nearby pharmacy provider: " + provider);
        };
    }
}
