package com.rhc.notificationservice.repository;

import com.rhc.notificationservice.entity.NotificationRecord;
import com.rhc.notificationservice.entity.NotificationStatus;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface NotificationRecordRepository extends JpaRepository<NotificationRecord, Long> {
    Optional<NotificationRecord> findByEventId(String eventId);
    List<NotificationRecord> findByUserIdOrderByCreatedAtDesc(Long userId);

    @Query("select n from NotificationRecord n where n.status = :status " +
            "and (n.scheduledAt is null or n.scheduledAt <= :now) " +
            "and (n.nextAttemptAt is null or n.nextAttemptAt <= :now) order by n.createdAt")
    List<NotificationRecord> findDue(@Param("status") NotificationStatus status,
                                     @Param("now") LocalDateTime now, Pageable pageable);
}
