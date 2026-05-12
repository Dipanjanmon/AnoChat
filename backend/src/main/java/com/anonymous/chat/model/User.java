package com.anonymous.chat.model;

import jakarta.persistence.*;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * SHA-256 hash of the canonical +91XXXXXXXXXX phone number.
     * The real phone number is NEVER stored — only this one-way hash.
     */
    @Column(name = "phone_hash", unique = true, nullable = false)
    private String phoneHash;

    /**
     * Randomly generated funny display name, e.g. "SleepyNarwhal#4821".
     * This is the only identity the system knows. No real name, ever.
     */
    @Column(name = "anonymous_name", unique = true, nullable = false)
    private String anonymousName;

    public User() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getPhoneHash() { return phoneHash; }
    public void setPhoneHash(String phoneHash) { this.phoneHash = phoneHash; }

    public String getAnonymousName() { return anonymousName; }
    public void setAnonymousName(String anonymousName) { this.anonymousName = anonymousName; }
}
