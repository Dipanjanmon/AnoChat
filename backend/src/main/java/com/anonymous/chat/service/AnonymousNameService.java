package com.anonymous.chat.service;

import org.springframework.stereotype.Service;
import java.util.Random;

@Service
public class AnonymousNameService {

    // Funny adjectives — describe quirky vibes
    private final String[] ADJECTIVES = {
        "Sleepy", "Chaotic", "Sneaky", "Wobbly", "Grumpy", "Fuzzy", "Spicy",
        "Bouncy", "Clumsy", "Salty", "Derpy", "Gloomy", "Hyper", "Lazy",
        "Melted", "Noodle", "Pudgy", "Quirky", "Rusty", "Soggy", "Tiny",
        "Zesty", "Angry", "Blurry", "Chunky", "Dizzy", "Floppy", "Gassy",
        "Hangry", "Itchy", "Jumpy", "Kooky", "Lumpy", "Mushy", "Nerdy",
        "Perky", "Squishy", "Tangy", "Wiggly", "Yawning"
    };

    // Funny nouns — unexpected and memorable
    private final String[] NOUNS = {
        "Narwhal", "Toaster", "Biscuit", "Waffle", "Pickle", "Nugget",
        "Burrito", "Panda", "Sloth", "Platypus", "Hamster", "Meatball",
        "Taco", "Noodle", "Donut", "Potato", "Burp", "Cactus", "Avocado",
        "Penguin", "Mango", "Pigeon", "Llama", "Walrus", "Blobfish",
        "Raccoon", "Sasquatch", "Goblin", "Gremlin", "Yeti", "Kraken",
        "Dumpling", "Pretzel", "Jellyfish", "Capybara", "Ferret", "Axolotl",
        "Croissant", "Broccoli", "Cucumber"
    };

    private final Random random = new Random();

    public String generateName() {
        String adj  = ADJECTIVES[random.nextInt(ADJECTIVES.length)];
        String noun = NOUNS[random.nextInt(NOUNS.length)];
        int num     = 1000 + random.nextInt(9000); // 4-digit suffix
        return adj + noun + "#" + num;
    }
}
