package com.rhc.doctorservice.service;

import com.rhc.doctorservice.dto.*;
import com.rhc.doctorservice.entity.Doctor;
import com.rhc.doctorservice.exception.DoctorNotFoundException;
import com.rhc.doctorservice.repository.DoctorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DoctorService {
    private final DoctorRepository doctorRepository;

    @Transactional
    public DoctorProfileResponse createProfile(Long userId, DoctorProfileRequest request) {
        Doctor doctor = Doctor.builder()
                .userId(userId)
                .fullName(request.getFullName())
                .specialization(request.getSpecialization())
                .qualification(request.getQualification())
                .yearsOfExperience(request.getYearsOfExperience())
                .consultationDetails(request.getConsultationDetails())
                .status(Doctor.VerificationStatus.PENDING_VERIFICATION)
                .isAvailable(true)
                .build();

        Doctor saved = doctorRepository.save(doctor);
        return mapToResponse(saved);
    }

    public List<DoctorProfileResponse> searchDoctors(String specialization) {
        List<Doctor> doctors = doctorRepository.findBySpecializationAndStatus(
                specialization, Doctor.VerificationStatus.APPROVED);
        return doctors.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<DoctorProfileResponse> listPendingDoctors() {
        return doctorRepository.findByStatus(Doctor.VerificationStatus.PENDING_VERIFICATION).stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<DoctorProfileResponse> listDoctors() {
        return doctorRepository.findByStatus(Doctor.VerificationStatus.APPROVED).stream()
                .filter(Doctor::isAvailable)
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public DoctorProfileResponse getDoctorById(Long userId) {
        Doctor doctor = doctorRepository.findById(userId)
                .orElseThrow(() -> new DoctorNotFoundException(userId));
        return mapToResponse(doctor);
    }

    @Transactional
    public DoctorProfileResponse updateProfile(Long userId, DoctorProfileRequest request) {
        Doctor doctor = doctorRepository.findById(userId)
                .orElseThrow(() -> new DoctorNotFoundException(userId));
        doctor.setFullName(request.getFullName());
        doctor.setSpecialization(request.getSpecialization());
        doctor.setQualification(request.getQualification());
        doctor.setYearsOfExperience(request.getYearsOfExperience());
        doctor.setConsultationDetails(request.getConsultationDetails());
        return mapToResponse(doctorRepository.save(doctor));
    }

    @Transactional
    public DoctorProfileResponse updateVerificationStatus(Long userId, Doctor.VerificationStatus status) {
        Doctor doctor = doctorRepository.findById(userId)
                .orElseThrow(() -> new DoctorNotFoundException(userId));
        doctor.setStatus(status);
        return mapToResponse(doctorRepository.save(doctor));
    }

    @Transactional
    public void toggleAvailability(Long userId, boolean available) {
        Doctor doctor = doctorRepository.findById(userId)
                .orElseThrow(() -> new DoctorNotFoundException(userId));
        doctor.setAvailable(available);
        doctorRepository.save(doctor);
    }

    private DoctorProfileResponse mapToResponse(Doctor doctor) {
        return DoctorProfileResponse.builder()
                .userId(doctor.getUserId())
                .fullName(doctor.getFullName())
                .specialization(doctor.getSpecialization())
                .qualification(doctor.getQualification())
                .yearsOfExperience(doctor.getYearsOfExperience())
                .consultationDetails(doctor.getConsultationDetails())
                .status(doctor.getStatus())
                .isAvailable(doctor.isAvailable())
                .build();
    }
}
