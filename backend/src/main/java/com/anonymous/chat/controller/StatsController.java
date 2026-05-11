package com.anonymous.chat.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/stats")
public class StatsController {

    @Autowired
    private StringRedisTemplate redisTemplate;

    @GetMapping("/live")
    public ResponseEntity<?> getLiveStats() {
        String totalStr = redisTemplate.opsForValue().get("chat:live_users_total");
        Long total = 0L;
        if (totalStr != null) {
            try {
                total = Long.parseLong(totalStr);
            } catch (NumberFormatException e) {
                // Ignore
            }
        }
        Map<String, Long> response = new HashMap<>();
        response.put("liveUsers", total);
        return ResponseEntity.ok(response);
    }
}
