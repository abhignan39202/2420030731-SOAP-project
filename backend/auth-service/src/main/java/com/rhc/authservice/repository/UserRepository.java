package com.rhc.authservice.repository;

import com.rhc.authservice.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);
    Optional<User> findByEmail(String email);
    Optional<User> findByEmailIgnoreCase(String email);
    Optional<User> findBySupabaseUserId(String supabaseUserId);
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);
}
