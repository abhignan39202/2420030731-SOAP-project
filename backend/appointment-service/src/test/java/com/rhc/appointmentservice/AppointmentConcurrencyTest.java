package com.rhc.appointmentservice;

import com.rhc.appointmentservice.client.DoctorClient;
import com.rhc.appointmentservice.dto.AppointmentRequest;
import com.rhc.appointmentservice.dto.DoctorProfileResponse;
import com.rhc.appointmentservice.entity.DoctorSchedule;
import com.rhc.appointmentservice.repository.AppointmentRepository;
import com.rhc.appointmentservice.repository.DoctorScheduleRepository;
import com.rhc.appointmentservice.service.AppointmentService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.when;

@SpringBootTest
@ActiveProfiles("test")
class AppointmentConcurrencyTest {

    @Autowired
    private AppointmentService appointmentService;

    @Autowired
    private AppointmentRepository appointmentRepository;

    @Autowired
    private DoctorScheduleRepository scheduleRepository;

    @MockitoBean
    private DoctorClient doctorClient;

    private Long doctorId = 55L;
    private LocalDate appointmentDate = LocalDate.now().plusDays(3);
    private LocalTime startTime = LocalTime.of(14, 0);
    private LocalTime endTime = LocalTime.of(14, 30);

    @BeforeEach
    void setUp() {
        appointmentRepository.deleteAll();
        scheduleRepository.deleteAll();

        // Doctor is approved
        when(doctorClient.getDoctorById(anyLong())).thenReturn(
                DoctorProfileResponse.builder()
                        .userId(doctorId)
                        .status("APPROVED")
                        .isAvailable(true)
                        .build()
        );

        // Doctor is available
        scheduleRepository.save(
                DoctorSchedule.builder()
                        .doctorId(doctorId)
                        .dayOfWeek(appointmentDate.getDayOfWeek())
                        .startTime(LocalTime.of(8, 0))
                        .endTime(LocalTime.of(18, 0))
                        .isAvailable(true)
                        .build()
        );
    }

    @Test
    void testConcurrentBookingForSameSlot_PreventsDoubleBooking() throws InterruptedException {
        int numberOfThreads = 10;
        ExecutorService executorService = Executors.newFixedThreadPool(numberOfThreads);
        CountDownLatch latch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(numberOfThreads);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger conflictCount = new AtomicInteger(0);

        for (int i = 0; i < numberOfThreads; i++) {
            final long patientId = 1000L + i;
            executorService.submit(() -> {
                try {
                    latch.await(); // Synchronize all threads to start simultaneously
                    AppointmentRequest req = AppointmentRequest.builder()
                            .doctorId(doctorId)
                            .appointmentDate(appointmentDate)
                            .startTime(startTime)
                            .endTime(endTime)
                            .reason("Concurrent test booking")
                            .build();

                    appointmentService.bookAppointment(patientId, req);
                    successCount.incrementAndGet();
                } catch (Exception e) {
                    conflictCount.incrementAndGet();
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        latch.countDown(); // Unblock threads
        doneLatch.await(); // Wait for all threads to finish
        executorService.shutdown();

        assertEquals(1, successCount.get(), "Exactly one booking should succeed for the slot");
        assertEquals(numberOfThreads - 1, conflictCount.get(), "All other concurrent bookings should fail");
        assertEquals(1, appointmentRepository.findAll().size(), "Only 1 appointment should be stored in DB");
    }
}
