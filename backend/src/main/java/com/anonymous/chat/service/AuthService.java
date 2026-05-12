package com.anonymous.chat.service;

import com.anonymous.chat.model.User;
import com.anonymous.chat.repository.UserRepository;
import com.anonymous.chat.security.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.HexFormat;
import java.util.concurrent.TimeUnit;
import java.util.regex.Pattern;

@Service
public class AuthService {

    // Indian mobile number pattern: starts with 6-9, 10 digits
    private static final Pattern INDIAN_MOBILE = Pattern.compile("^(\\+91|91|0)?([6-9]\\d{9})$");

    @Autowired private UserRepository userRepository;
    @Autowired private AnonymousNameService nameService;
    @Autowired private JwtUtil jwtUtil;
    @Autowired private StringRedisTemplate redisTemplate;

    @Value("${fast2sms.api.key:DEMO}")
    private String fast2SmsApiKey;

    // ── Validate & normalise Indian number ──────────────────────────
    private String normaliseIndianNumber(String raw) {
        if (raw == null) throw new IllegalArgumentException("Phone number is required");
        String stripped = raw.trim().replaceAll("[\\s\\-()]", "");
        var m = INDIAN_MOBILE.matcher(stripped);
        if (!m.matches()) throw new IllegalArgumentException("Only Indian mobile numbers (+91 / 10-digit) are accepted");
        return "+91" + m.group(2); // canonical form
    }

    // ── SHA-256 hash the number — one-way, reversible by no one ────
    private String hashPhone(String phone) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] bytes = digest.digest(phone.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(bytes);
        } catch (Exception e) {
            throw new RuntimeException("Hashing failed", e);
        }
    }

    // ── Generate secure 6-digit OTP ─────────────────────────────────
    private String generateOtp() {
        return String.format("%06d", new SecureRandom().nextInt(1_000_000));
    }

    @Value("${otp.dev.mode:false}")
    private boolean devMode;

    // ── Send OTP via Fast2SMS Quick SMS (route=q, no DLT needed) ────
    private String sendOtpViaSms(String phoneNumber, String otp) {
        if ("DEMO".equals(fast2SmsApiKey) || fast2SmsApiKey.isBlank()) {
            System.out.println("══════════════════════════════════════");
            System.out.println(" [DEV] OTP for " + phoneNumber + " → " + otp);
            System.out.println("══════════════════════════════════════");
            return devMode ? otp : null;
        }

        try {
            String tenDigit  = phoneNumber.replace("+91", "");
            String message   = URLEncoder.encode("Your Neon Aura OTP is: " + otp + ". Valid for 5 minutes. Do not share.", StandardCharsets.UTF_8);

            // route=q = Quick SMS, works without DLT website verification
            String url = "https://www.fast2sms.com/dev/bulkV2"
                + "?authorization=" + URLEncoder.encode(fast2SmsApiKey, StandardCharsets.UTF_8)
                + "&message=" + message
                + "&language=english"
                + "&route=q"
                + "&numbers=" + tenDigit;

            HttpClient client   = HttpClient.newHttpClient();
            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("cache-control", "no-cache")
                .GET()
                .build();

            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            System.out.println("Fast2SMS response: " + response.body());

            // If SMS fails AND dev mode is on, return OTP so frontend can show it
            if (response.statusCode() != 200 || response.body().contains("\"return\":false")) {
                System.err.println("SMS failed — falling back to console OTP");
                System.out.println("══════════════════════════════════════");
                System.out.println(" [FALLBACK] OTP for " + phoneNumber + " → " + otp);
                System.out.println("══════════════════════════════════════");
                return devMode ? otp : null;
            }

        } catch (Exception e) {
            System.err.println("OTP send exception: " + e.getMessage());
        }
        return null; // null = SMS sent, no need to expose OTP
    }

    // ── PUBLIC: Send OTP ─────────────────────────────────────────────
    public String sendOtp(String rawPhone) {
        String phone  = normaliseIndianNumber(rawPhone);
        String hashed = hashPhone(phone);

        // Enforce single-device: reject if user already has an active session
        String activeSession = redisTemplate.opsForValue().get("session:" + hashed);
        if (activeSession != null) {
            throw new IllegalStateException("This number is already logged in on another device. Please sign out there first.");
        }

        String otp = generateOtp();

        // Store in Redis with 5-minute TTL
        redisTemplate.opsForValue().set("otp:" + hashed, otp, 5, TimeUnit.MINUTES);

        // Returns non-null only in dev mode when SMS fails
        return sendOtpViaSms(phone, otp);
    }

    // ── PUBLIC: Verify OTP & return JWT ─────────────────────────────
    public String verifyOtp(String rawPhone, String otp) {
        String phone = normaliseIndianNumber(rawPhone);
        String hashed = hashPhone(phone);

        String storedOtp = redisTemplate.opsForValue().get("otp:" + hashed);
        if (storedOtp == null || !storedOtp.equals(otp.trim())) {
            throw new RuntimeException("Invalid or expired OTP. Please try again.");
        }

        // Consume the OTP — cannot be reused
        redisTemplate.delete("otp:" + hashed);

        // Find or create the user record (keyed by hash, not real number)
        User user = userRepository.findByPhoneHash(hashed)
            .orElseGet(() -> {
                User newUser = new User();
                newUser.setPhoneHash(hashed);
                String name;
                do { name = nameService.generateName(); }
                while (userRepository.existsByAnonymousName(name));
                newUser.setAnonymousName(name);
                return userRepository.save(newUser);
            });

        // Mark session active in Redis (expires in 24h, matching JWT lifetime)
        redisTemplate.opsForValue().set("session:" + hashed, user.getAnonymousName(), 24, TimeUnit.HOURS);

        return jwtUtil.generateToken(user.getAnonymousName());
    }

    // ── PUBLIC: Sign out — delete everything ─────────────────────────
    public void signOut(String anonymousName) {
        // Find user by anonymous name to get their hash
        userRepository.findByAnonymousName(anonymousName).ifPresent(user -> {
            String hashed = user.getPhoneHash();

            // 1. Clear active session
            redisTemplate.delete("session:" + hashed);

            // 2. Delete user from database entirely
            userRepository.delete(user);

            // 3. Blacklist the JWT (Redis, 24h TTL)
            redisTemplate.opsForValue().set("jwt:blacklist:" + anonymousName, "1", 24, TimeUnit.HOURS);

            System.out.println("User " + anonymousName + " signed out and all data deleted.");
        });
    }
}
