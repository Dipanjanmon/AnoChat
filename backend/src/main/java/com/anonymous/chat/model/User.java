package com.anonymous.chat.model;

import jakarta.persistence.*;

@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Hashed or encrypted phone number for privacy
    @Column(unique = true, nullable = false)
    private String phoneNumber;

    @Column(nullable = false)
    private String anonymousName;

    public User() {
    }

    public User(Long id, String phoneNumber, String anonymousName) {
        this.id = id;
        this.phoneNumber = phoneNumber;
        this.anonymousName = anonymousName;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getPhoneNumber() {
        return phoneNumber;
    }

    public void setPhoneNumber(String phoneNumber) {
        this.phoneNumber = phoneNumber;
    }

    public String getAnonymousName() {
        return anonymousName;
    }

    public void setAnonymousName(String anonymousName) {
        this.anonymousName = anonymousName;
    }
}
