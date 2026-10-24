package com.rhc.pharmacyservice.provider;

final class ProviderGeoUtils {
    private ProviderGeoUtils() {
    }

    static double distanceMeters(double latitudeOne, double longitudeOne, double latitudeTwo, double longitudeTwo) {
        double earthRadiusMeters = 6_371_000;
        double latitudeDelta = Math.toRadians(latitudeTwo - latitudeOne);
        double longitudeDelta = Math.toRadians(longitudeTwo - longitudeOne);
        double a = Math.sin(latitudeDelta / 2) * Math.sin(latitudeDelta / 2)
                + Math.cos(Math.toRadians(latitudeOne))
                * Math.cos(Math.toRadians(latitudeTwo))
                * Math.sin(longitudeDelta / 2) * Math.sin(longitudeDelta / 2);
        return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
}
