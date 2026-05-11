package com.anonymous.chat.service;

import org.springframework.stereotype.Service;

import java.util.Random;

@Service
public class AnonymousNameService {

    private final String[] ADJECTIVES = {"Silent", "Mystic", "Neon", "Cyber", "Ghost", "Shadow", "Crimson", "Azure", "Golden", "Midnight", "Lunar", "Solar", "Cosmic", "Phantom", "Ethereal"};
    private final String[] NOUNS = {"Ninja", "Wolf", "Cipher", "Raven", "Dragon", "Phoenix", "Tiger", "Fox", "Specter", "Wanderer", "Nomad", "Samurai", "Oracle", "Glitch", "Voyager"};
    
    private final Random random = new Random();

    public String generateName() {
        String adj = ADJECTIVES[random.nextInt(ADJECTIVES.length)];
        String noun = NOUNS[random.nextInt(NOUNS.length)];
        int number = 1000 + random.nextInt(9000); // 4-digit number
        return adj + noun + "#" + number;
    }
}
