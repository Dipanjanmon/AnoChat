package com.anonymous.chat.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Service
public class MatchmakingService {

    private static final String WAITING_QUEUE = "chat:waiting_queue";
    private static final String ACTIVE_PAIRS = "chat:active_pairs:";

    @Autowired
    private StringRedisTemplate redisTemplate;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    public void findMatch(String anonymousName) {
        // Try to pop someone from the queue
        String partner = redisTemplate.opsForList().rightPop(WAITING_QUEUE);

        if (partner != null && !partner.equals(anonymousName)) {
            // Match found!
            String roomId = UUID.randomUUID().toString();
            
            // Store pair logic (RoomID -> User1, User2)
            redisTemplate.opsForValue().set(ACTIVE_PAIRS + anonymousName, roomId, 2, TimeUnit.HOURS);
            redisTemplate.opsForValue().set(ACTIVE_PAIRS + partner, roomId, 2, TimeUnit.HOURS);

            // Notify both users
            messagingTemplate.convertAndSendToUser(anonymousName, "/queue/match", "{\"status\":\"matched\", \"partner\":\"" + partner + "\", \"roomId\":\"" + roomId + "\"}");
            messagingTemplate.convertAndSendToUser(partner, "/queue/match", "{\"status\":\"matched\", \"partner\":\"" + anonymousName + "\", \"roomId\":\"" + roomId + "\"}");
        } else {
            // Add self to queue
            redisTemplate.opsForList().leftPush(WAITING_QUEUE, anonymousName);
            messagingTemplate.convertAndSendToUser(anonymousName, "/queue/match", "{\"status\":\"waiting\"}");
        }
    }

    public void leaveMatch(String anonymousName) {
        String roomId = redisTemplate.opsForValue().get(ACTIVE_PAIRS + anonymousName);
        if (roomId != null) {
            // Find partner and notify them
            // In a real scenario, we might keep a Reverse lookup RoomId -> List<Users>
            // Here we just broadcast to the room that chat ended.
            messagingTemplate.convertAndSend("/topic/chat/" + roomId, "{\"type\":\"LEAVE\", \"sender\":\"System\"}");
            
            // Clean up
            redisTemplate.delete(ACTIVE_PAIRS + anonymousName);
            redisTemplate.opsForList().remove(WAITING_QUEUE, 0, anonymousName); // Ensure they are removed from waiting list
        } else {
            // Just remove from queue
            redisTemplate.opsForList().remove(WAITING_QUEUE, 0, anonymousName);
        }
    }
}
