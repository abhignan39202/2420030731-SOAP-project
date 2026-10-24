package com.rhc.ambulanceservice.config;

import com.rhc.ambulanceservice.repository.AmbulanceOperatorRepository;
import com.rhc.ambulanceservice.repository.AmbulanceRepository;
import org.junit.jupiter.api.Test;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;

class DataInitializerTest {

    @Test
    void doesNotSeedDemoAmbulancesUnlessExplicitlyEnabled() throws Exception {
        AmbulanceOperatorRepository operators = mock(AmbulanceOperatorRepository.class);
        AmbulanceRepository ambulances = mock(AmbulanceRepository.class);

        new DataInitializer(operators, ambulances).run();

        verifyNoInteractions(operators, ambulances);
    }
}
