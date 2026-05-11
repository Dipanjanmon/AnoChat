package com.anonymous.chat.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.connection.Message;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import java.nio.charset.StandardCharsets;

@Service
public class RedisMessageSubscriber implements MessageListener {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Override
    public void onMessage(Message message, byte[] pattern) {
        String publishedMsg = new String(message.getBody(), StandardCharsets.UTF_8);
        // Format of publishedMsg: roomId|jsonPayload
        int separatorIdx = publishedMsg.indexOf('|');
        if (separatorIdx > 0) {
            String roomId = publishedMsg.substring(0, separatorIdx);
            String payload = publishedMsg.substring(separatorIdx + 1);
            messagingTemplate.convertAndSend("/topic/chat/" + roomId, payload);
        }
    }
}
