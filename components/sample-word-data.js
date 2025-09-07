
// Sample Word Data Format for Enhanced ReadMode

export const sampleWords = [
  {
    id: 1,
    word: "gregarious",
    image: "img1.jpg", // Maps to /public/images/img1.jpg
    pronunciation: "grɪˈɡɛəriəs",
    definition: "Fond of the company of others; sociable",
    part_of_speech: "adjective",
    etymology: "From Latin 'gregarius' meaning 'belonging to a flock'",
    examples: [
      "She's so gregarious that even strangers feel like her best friends.",
      "At the networking event, his gregarious nature helped him meet dozens of people."
    ],
    synonyms: ["sociable", "outgoing", "friendly"],
    antonyms: ["introverted", "reserved", "unsociable"],
    word_grouping: ["personality", "social behavior"],
    tags: ["social", "personality", "positive trait"],
    mastery: 2,
    group: 1
  },
  {
    id: 2,
    word: "serendipity",
    image: "img2.jpg", // Maps to /public/images/img2.jpg  
    pronunciation: "ˌsɛrənˈdɪpɪti",
    definition: "The occurrence of events by chance in a happy way",
    part_of_speech: "noun",
    etymology: "Coined by Horace Walpole in 1754",
    examples: [
      "It was pure serendipity that led to their meeting",
      "Life's serendipitous moments often become our most treasured memories"
    ],
    synonyms: ["chance", "fortune", "luck", "coincidence"],
    antonyms: ["misfortune", "design", "planning"],
    word_grouping: ["abstract concepts", "luck"],
    tags: ["chance", "positive", "fate"],
    mastery: 4,
    group: 2
  },
  {
    id: 3,
    word: "ephemeral",
    // No image property - will auto-look for /public/images/ephemeral.jpg
    pronunciation: "ɪˈfɛmərəl",
    definition: "Lasting for a very short time",
    part_of_speech: "adjective", 
    etymology: "From Greek 'ephemeros' meaning 'lasting only a day'",
    examples: [
      "The ephemeral beauty of cherry blossoms",
      "Youth is ephemeral, so make the most of it"
    ],
    synonyms: ["temporary", "fleeting", "transient", "momentary"],
    antonyms: ["permanent", "lasting", "enduring", "eternal"],
    word_grouping: ["time", "descriptive"],
    tags: ["time", "temporary", "poetic"],
    mastery: 1,
    group: 1
  }
];

// Usage in your API or component:
// const words = sampleWords; // or fetch from your API
// setAllWords(words);
