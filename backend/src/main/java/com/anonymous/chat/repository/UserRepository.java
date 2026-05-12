package com.anonymous.chat.repository;

import com.anonymous.chat.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByPhoneHash(String phoneHash);
    Optional<User> findByAnonymousName(String anonymousName);
    boolean existsByAnonymousName(String anonymousName);
}
