package com.anonymous.chat.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/stats")
public class StatsController {

    @Autowired
    private StringRedisTemplate redisTemplate;

    @GetMapping("/live")
    public ResponseEntity<?> getLiveStats() {
        // Count members in the authenticated-users Redis Set
        Long count = redisTemplate.opsForSet().size("chat:live_auth_users");
        long live = (count != null) ? count : 0;
        return ResponseEntity.ok(Map.of("liveUsers", live));
    }
}
