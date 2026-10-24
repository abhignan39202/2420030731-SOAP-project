package com.rhc.pharmacyservice.provider;

import com.rhc.pharmacyservice.dto.NearbyPharmacyResponse;

import java.util.List;

/** Provider boundary for nearby places. A different maps provider can be selected without changing the API. */
public interface NearbyPharmacyProvider {
    List<NearbyPharmacyResponse> findNearby(double latitude, double longitude, int radiusMeters);
}
