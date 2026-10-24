package com.rhc.userservice.repository;

import com.rhc.userservice.entity.PatientProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface PatientProfileRepository extends JpaRepository<PatientProfile, Long> {
}
