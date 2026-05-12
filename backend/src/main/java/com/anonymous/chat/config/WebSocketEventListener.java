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

    /**
     * Redis key: hash of anonymousName → number of active WS connections for that user.
     * Only authenticated users are tracked here. Guest connections (landing page) are ignored.
     */
    private static final String LIVE_USERS_KEY = "chat:live_auth_users";

    @Autowired private StringRedisTemplate redisTemplate;
    @Autowired private SimpMessagingTemplate messagingTemplate;

    @EventListener
    public void onConnect(SessionConnectedEvent event) {
        // Only count authenticated users — guests have no Principal
        if (event.getUser() == null || event.getUser().getName() == null) return;

        String userId = event.getUser().getName(); // anonymousName (JWT subject)

        // SADD returns 1 if it's a new member, 0 if already present
        Long added = redisTemplate.opsForSet().add(LIVE_USERS_KEY, userId);
        if (added != null && added > 0) {
            broadcastCount();
        }
    }

    @EventListener
    public void onDisconnect(SessionDisconnectEvent event) {
        if (event.getUser() == null || event.getUser().getName() == null) return;

        String userId = event.getUser().getName();

        // Remove from live set
        redisTemplate.opsForSet().remove(LIVE_USERS_KEY, userId);
        broadcastCount();
    }

    private void broadcastCount() {
        Long count = redisTemplate.opsForSet().size(LIVE_USERS_KEY);
        long live = (count != null) ? count : 0;
        messagingTemplate.convertAndSend("/topic/stats", "{\"liveUsers\": " + live + "}");
    }
}
