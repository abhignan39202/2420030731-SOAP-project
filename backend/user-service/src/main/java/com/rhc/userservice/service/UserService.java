package com.rhc.userservice.service;

import com.rhc.userservice.dto.*;
import com.rhc.userservice.entity.PatientProfile;
import com.rhc.userservice.repository.PatientProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class UserService {
    private final PatientProfileRepository profileRepository;

    @Transactional
    public PatientProfileResponse createProfile(Long userId, PatientProfileRequest request) {
        PatientProfile profile = PatientProfile.builder()
                .userId(userId)
                .fullName(request.getFullName())
                .phoneNumber(request.getPhoneNumber())
                .address(request.getAddress())
                .ruralLocation(request.getRuralLocation())
                .bloodGroup(request.getBloodGroup())
                .gender(request.getGender())
                .dateOfBirth(request.getDateOfBirth())
                .allergies(request.getAllergies())
                .medicalHistory(request.getMedicalHistory())
                .emergencyContactDetails(request.getEmergencyContactDetails())
                .build();

        PatientProfile saved = profileRepository.save(profile);
        return mapToResponse(saved);
    }

    public PatientProfileResponse getProfile(Long userId) {
        PatientProfile profile = profileRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Patient profile not found"));
        return mapToResponse(profile);
    }

    @Transactional
    public PatientProfileResponse updateProfile(Long userId, PatientProfileRequest request) {
        PatientProfile profile = profileRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Patient profile not found"));

        profile.setFullName(request.getFullName());
        profile.setPhoneNumber(request.getPhoneNumber());
        profile.setAddress(request.getAddress());
        profile.setRuralLocation(request.getRuralLocation());
        profile.setBloodGroup(request.getBloodGroup());
        profile.setGender(request.getGender());
        profile.setDateOfBirth(request.getDateOfBirth());
        profile.setAllergies(request.getAllergies());
        profile.setMedicalHistory(request.getMedicalHistory());
        profile.setEmergencyContactDetails(request.getEmergencyContactDetails());

        return mapToResponse(profileRepository.save(profile));
    }

    private PatientProfileResponse mapToResponse(PatientProfile profile) {
        return PatientProfileResponse.builder()
                .userId(profile.getUserId())
                .fullName(profile.getFullName())
                .phoneNumber(profile.getPhoneNumber())
                .address(profile.getAddress())
                .ruralLocation(profile.getRuralLocation())
                .bloodGroup(profile.getBloodGroup())
                .gender(profile.getGender())
                .dateOfBirth(profile.getDateOfBirth())
                .allergies(profile.getAllergies())
                .medicalHistory(profile.getMedicalHistory())
                .emergencyContactDetails(profile.getEmergencyContactDetails())
                .build();
    }
}
