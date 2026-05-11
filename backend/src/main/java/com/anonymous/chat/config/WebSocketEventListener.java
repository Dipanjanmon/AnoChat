package com.anonymous.chat.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

@Component
public class WebSocketEventListener {

    private static final String LIVE_USERS_HASH = "chat:user_connections";
    private static final String LIVE_USERS_TOTAL = "chat:live_users_total";

    @Autowired
    private StringRedisTemplate redisTemplate;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @EventListener
    public void handleWebSocketConnectListener(SessionConnectedEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        
        // Use session ID if user is not authenticated (for the landing page guest connections)
        String userId = headerAccessor.getSessionId();
        if (event.getUser() != null && event.getUser().getName() != null) {
            userId = event.getUser().getName();
        }

        // Increment the number of connections for this user
        Long connections = redisTemplate.opsForHash().increment(LIVE_USERS_HASH, userId, 1);
        
        // If this is their first connection, they are a new unique live user
        if (connections != null && connections == 1) {
            Long total = redisTemplate.opsForValue().increment(LIVE_USERS_TOTAL);
            broadcastLiveCount(total);
        }
    }

    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        
        String userId = headerAccessor.getSessionId();
        if (event.getUser() != null && event.getUser().getName() != null) {
            userId = event.getUser().getName();
        }

        // Decrement connection count
        Long connections = redisTemplate.opsForHash().increment(LIVE_USERS_HASH, userId, -1);
        
        if (connections != null && connections <= 0) {
            // Remove user from hash
            redisTemplate.opsForHash().delete(LIVE_USERS_HASH, userId);
            
            // Decrement total live users
            Long total = redisTemplate.opsForValue().decrement(LIVE_USERS_TOTAL);
            if (total != null && total < 0) {
                redisTemplate.opsForValue().set(LIVE_USERS_TOTAL, "0");
                total = 0L;
            }
            broadcastLiveCount(total);
        }
    }

    private void broadcastLiveCount(Long total) {
        if (total != null) {
            messagingTemplate.convertAndSend("/topic/stats", "{\"liveUsers\": " + total + "}");
        }
    }
}
