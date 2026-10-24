package com.rhc.medicineservice.config;

import com.rhc.medicineservice.repository.MedicineRepository;
import org.junit.jupiter.api.Test;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;

class DataInitializerTest {

    @Test
    void doesNotSeedDefaultMedicinesUnlessExplicitlyEnabled() {
        MedicineRepository repository = mock(MedicineRepository.class);

        new DataInitializer(repository).run();

        verifyNoInteractions(repository);
    }
}
