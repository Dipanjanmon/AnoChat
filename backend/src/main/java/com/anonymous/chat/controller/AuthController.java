package com.anonymous.chat.controller;

import com.anonymous.chat.service.AuthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private AuthService authService;

    @PostMapping("/send-otp")
    public ResponseEntity<?> sendOtp(@RequestBody Map<String, String> request) {
        String phoneNumber = request.get("phoneNumber");
        if (phoneNumber == null || phoneNumber.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Phone number is required"));
        }
        try {
            String devOtp = authService.sendOtp(phoneNumber); // non-null only in dev mode
            Map<String, Object> response = new HashMap<>();
            response.put("message", "OTP sent successfully");
            // Only included when otp.dev.mode=true — for local testing
            if (devOtp != null) response.put("__dev_otp", devOtp);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(409).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<?> verifyOtp(@RequestBody Map<String, String> request) {
        String phoneNumber = request.get("phoneNumber");
        String otp         = request.get("otp");

        if (phoneNumber == null || otp == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Phone number and OTP are required"));
        }

        try {
            String token = authService.verifyOtp(phoneNumber, otp);
            return ResponseEntity.ok(Map.of("token", token));
        } catch (Exception e) {
            return ResponseEntity.status(401).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/signout")
    public ResponseEntity<?> signOut(Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Not authenticated"));
        }
        authService.signOut(authentication.getName());
        return ResponseEntity.ok(Map.of("message", "Signed out. All data deleted."));
    }
}
