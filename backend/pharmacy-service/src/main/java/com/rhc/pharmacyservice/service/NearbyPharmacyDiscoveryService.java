package com.rhc.pharmacyservice.service;

import com.rhc.pharmacyservice.dto.NearbyPharmacyResponse;
import com.rhc.pharmacyservice.exception.InvalidLocationException;
import com.rhc.pharmacyservice.provider.NearbyPharmacyProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class NearbyPharmacyDiscoveryService {

    private final NearbyPharmacyProvider provider;

    @Value("${nearby.pharmacy.default-radius-meters:5000}")
    private int defaultRadiusMeters;

    public List<NearbyPharmacyResponse> findNearby(double latitude, double longitude, Integer requestedRadiusMeters) {
        validateCoordinates(latitude, longitude);
        int radius = requestedRadiusMeters == null ? defaultRadiusMeters : requestedRadiusMeters;
        if (radius < 100 || radius > 50_000) {
            throw new InvalidLocationException("radiusMeters must be between 100 and 50000");
        }
        return provider.findNearby(latitude, longitude, radius);
    }

    private void validateCoordinates(double latitude, double longitude) {
        if (!Double.isFinite(latitude) || latitude < -90 || latitude > 90) {
            throw new InvalidLocationException("latitude must be between -90 and 90");
        }
        if (!Double.isFinite(longitude) || longitude < -180 || longitude > 180) {
            throw new InvalidLocationException("longitude must be between -180 and 180");
        }
    }
}
