from django.db import models
from django.conf import settings
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
class UserWordProgress(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    word = models.ForeignKey('Word', on_delete=models.CASCADE)
    mastery = models.IntegerField(default=0)
    times_correct = models.IntegerField(default=0)
    times_asked = models.IntegerField(default=0)
    last_practiced = models.DateTimeField(null=True, blank=True)
    next_review = models.DateTimeField(null=True, blank=True)
    ease_factor = models.FloatField(default=2.5)
    interval = models.IntegerField(default=1)  # in days
    due_date = models.DateTimeField(null=True, blank=True)
    repetitions = models.IntegerField(default=0)
    class Meta:
        unique_together = ('user', 'word')

class ReviewSession(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    word = models.ForeignKey('Word', on_delete=models.CASCADE)
    timestamp = models.DateTimeField(auto_now_add=True)
    result = models.BooleanField()  # True=correct, False=incorrect
    def __str__(self):
        return f"Q: {self.question[:50]}..."