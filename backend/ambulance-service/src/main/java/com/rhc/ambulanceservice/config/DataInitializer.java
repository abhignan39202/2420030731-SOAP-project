package com.rhc.ambulanceservice.config;

import com.rhc.ambulanceservice.entity.*;
import com.rhc.ambulanceservice.repository.AmbulanceOperatorRepository;
import com.rhc.ambulanceservice.repository.AmbulanceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final AmbulanceOperatorRepository operatorRepository;
    private final AmbulanceRepository ambulanceRepository;

    @Value("${ambulance.seed-data.enabled:false}")
    private boolean seedDataEnabled;

    @Override
    public void run(String... args) throws Exception {
        if (seedDataEnabled && operatorRepository.count() == 0) {
            AmbulanceOperator operator = AmbulanceOperator.builder()
                    .userId(300L) // Demo operator user ID
                    .name("Ramesh Kumar (Operator)")
                    .phone("+91 98765 00001")
                    .status(OperatorStatus.AVAILABLE)
                    .build();

            AmbulanceOperator savedOp = operatorRepository.save(operator);

            ambulanceRepository.save(Ambulance.builder()
                    .registrationNumber("AP-04-AM-1008")
                    .vehicleType("ADVANCED_LIFE_SUPPORT")
                    .status(AmbulanceStatus.AVAILABLE)
                    .latitude(17.3850)
                    .longitude(78.4867)
                    .lastLocationUpdate(LocalDateTime.now())
                    .operator(savedOp)
                    .build());

            // Backup ambulance
            AmbulanceOperator operator2 = AmbulanceOperator.builder()
                    .userId(301L)
                    .name("Suresh Singh (Operator)")
                    .phone("+91 98765 00002")
                    .status(OperatorStatus.AVAILABLE)
                    .build();

            AmbulanceOperator savedOp2 = operatorRepository.save(operator2);

            ambulanceRepository.save(Ambulance.builder()
                    .registrationNumber("AP-04-AM-1009")
                    .vehicleType("BASIC_LIFE_SUPPORT")
                    .status(AmbulanceStatus.AVAILABLE)
                    .latitude(17.4000)
                    .longitude(78.4900)
                    .lastLocationUpdate(LocalDateTime.now())
                    .operator(savedOp2)
                    .build());
        }
    }
}
