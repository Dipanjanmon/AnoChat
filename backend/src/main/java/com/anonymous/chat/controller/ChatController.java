package com.anonymous.chat.controller;

import com.anonymous.chat.service.MatchmakingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;

import java.util.Map;

@Controller
public class ChatController {

    @Autowired
    private MatchmakingService matchmakingService;

    @Autowired
    private StringRedisTemplate redisTemplate;

    @MessageMapping("/chat.findMatch")
    public void findMatch(Authentication authentication) {
        String anonymousName = authentication.getName();
        matchmakingService.findMatch(anonymousName);
    }

    @MessageMapping("/chat.leaveMatch")
    public void leaveMatch(Authentication authentication) {
        String anonymousName = authentication.getName();
        matchmakingService.leaveMatch(anonymousName);
    }

    @MessageMapping("/chat.sendMessage")
    public void sendMessage(@Payload Map<String, String> chatMessage, Authentication authentication) {
        String anonymousName = authentication.getName();
        String roomId = chatMessage.get("roomId");
        String content = chatMessage.get("content");
        String type = chatMessage.getOrDefault("type", "CHAT");

        // Format for JSON without using an external library for simplicity here
        String jsonPayload = String.format("{\"sender\":\"%s\", \"content\":\"%s\", \"type\":\"%s\"}",
                anonymousName, content.replace("\"", "\\\"").replace("\n", "\\n"), type);

        // Publish to Redis channel so all instances broadcast it
        redisTemplate.convertAndSend("chatChannel", roomId + "|" + jsonPayload);
    }
}
