package com.rhc.pharmacyservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** A provider-neutral pharmacy result returned by the discovery API. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NearbyPharmacyResponse {
    private String id;
    private String name;
    private String address;
    private Double distanceMeters;
    private String openStatus;
    private Double latitude;
    private Double longitude;
}
