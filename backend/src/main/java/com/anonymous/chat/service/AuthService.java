package com.anonymous.chat.service;

import com.anonymous.chat.model.User;
import com.anonymous.chat.repository.UserRepository;
import com.anonymous.chat.security.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class AuthService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AnonymousNameService nameService;

    @Autowired
    private JwtUtil jwtUtil;

    // In a real app, use Redis with TTL for OTP storage
    private final Map<String, String> otpStore = new ConcurrentHashMap<>();

    public void sendOtp(String phoneNumber) {
        // Generate 6 digit OTP
        String otp = String.valueOf((int) (Math.random() * 900000) + 100000);
        otpStore.put(phoneNumber, otp);
        
        // Mock sending OTP
        System.out.println("==========================================");
        System.out.println("MOCK OTP FOR " + phoneNumber + " IS: " + otp);
        System.out.println("==========================================");
    }

    public String verifyOtp(String phoneNumber, String otp) {
        String storedOtp = otpStore.get(phoneNumber);
        if (storedOtp != null && storedOtp.equals(otp)) {
            otpStore.remove(phoneNumber); // OTP used

            // Check if user exists
            User user = userRepository.findByPhoneNumber(phoneNumber)
                    .orElseGet(() -> {
                        User newUser = new User();
                        newUser.setPhoneNumber(phoneNumber);
                        
                        String newName;
                        do {
                            newName = nameService.generateName();
                        } while (userRepository.existsByAnonymousName(newName));
                        
                        newUser.setAnonymousName(newName);
                        return userRepository.save(newUser);
                    });

            return jwtUtil.generateToken(user.getAnonymousName());
        }
        throw new RuntimeException("Invalid OTP");
    }
}
