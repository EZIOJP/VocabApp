from django.db import models

class Word(models.Model):
    word = models.CharField(max_length=100, unique=True, default="N/A")
    pronunciation = models.CharField(max_length=100, default="N/A", blank=True)
    meaning = models.TextField(default="", blank=True)
    connotation = models.CharField(max_length=100, default="neutral")
    story_mnemonic = models.TextField(default="", blank=True)
    etymology = models.TextField(default="", blank=True)
    word_breakdown = models.JSONField(default=dict)  # optional: use lambda for structure
    category = models.CharField(max_length=50, default="N/A")
    difficulty_level = models.CharField(max_length=20, default="medium")
    synonyms = models.JSONField(default=list)
    antonyms = models.JSONField(default=list)
    word_grouping = models.JSONField(default=list)
    examples = models.JSONField(default=dict)  # e.g., {"GRE-style": "example text", "funny": "another example"}
    tags = models.JSONField(default=list)
    external_links = models.JSONField(default=dict)
    mastery = models.IntegerField(default=0)
    times_asked = models.IntegerField(default=0)
    times_correct = models.IntegerField(default=0)
    time_spent_quiz = models.IntegerField(default=0)
    time_spent_read = models.IntegerField(default=0)
    last_practiced = models.BigIntegerField(default=0)  # Or use DateTimeField
    spaced_repetition = models.JSONField(default=dict)
    user_data = models.JSONField(default=dict)
    source = models.CharField(max_length=100, default="Unknown", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.word
class MathQuestion(models.Model):
    question = models.TextField()
    answer = models.CharField(max_length=100)
    solution_steps = models.TextField()  # Could be a stringified list or JSON
    topic = models.CharField(max_length=100, blank=True, default="general")
    difficulty = models.CharField(max_length=20, choices=[("easy", "Easy"), ("medium", "Medium"), ("hard", "Hard")], default="easy")
    number = models.IntegerField(default=0)
    # Mastery & Tracking
    mastery = models.IntegerField(default=0)
    times_asked = models.IntegerField(default=0)
    times_correct = models.IntegerField(default=0)
    time_spent_quiz = models.IntegerField(default=0)  # seconds
    time_spent_read = models.IntegerField(default=0)
    last_practiced = models.DateTimeField(null=True, blank=True)

    # Spaced Repetition Fields
    spaced_repetition = models.JSONField(default=dict)  # e.g., {"interval": 0, "next_review": null}

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Q: {self.question[:50]}..."