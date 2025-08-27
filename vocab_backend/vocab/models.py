from django.db import models
from django.conf import settings

# ---------- JSON defaults (named factories; migration-safe) ----------
def default_word_breakdown():
    return {"prefix": "", "root": "", "suffix": ""}

def default_examples():
    # LIST of example objects: [{"text": "...", "tags": [], "style": "default"}, ...]
    return []

def default_spaced_repetition():
    # matches your required zeros/nulls
    return {"interval": 0, "next_review": None}

def default_user_data():
    return {"notes": "", "favorite": False, "user_tags": []}


class Word(models.Model):
    word = models.CharField(max_length=100, unique=True, default="N/A")
    pronunciation = models.CharField(max_length=100, default="N/A", blank=True)
    meaning = models.TextField(default="", blank=True)
    connotation = models.CharField(max_length=100, default="neutral")
    group_number = models.IntegerField(default=1, db_index=True)
    story_mnemonic = models.TextField(default="", blank=True)
    etymology = models.TextField(default="", blank=True)

    # Structured default so it never becomes an empty dict
    word_breakdown = models.JSONField(default=default_word_breakdown)

    category = models.CharField(max_length=50, default="N/A")
    difficulty_level = models.CharField(max_length=20, default="medium")

    synonyms = models.JSONField(default=list)
    antonyms = models.JSONField(default=list)
    word_grouping = models.JSONField(default=list)

    # LIST of example objects
    examples = models.JSONField(default=default_examples)

    tags = models.JSONField(default=list)
    external_links = models.JSONField(default=dict)

    mastery = models.IntegerField(default=0)
    times_asked = models.IntegerField(default=0)
    times_correct = models.IntegerField(default=0)
    time_spent_quiz = models.IntegerField(default=0)
    time_spent_read = models.IntegerField(default=0)

    # You’re storing epoch/int here by design
    last_practiced = models.BigIntegerField(default=0)

    # No lambdas in defaults — use a named function
    spaced_repetition = models.JSONField(default=default_spaced_repetition)

    user_data = models.JSONField(default=default_user_data)

    source = models.CharField(max_length=100, default="Unknown", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.word


class MathQuestion(models.Model):
    question = models.TextField()
    answer = models.CharField(max_length=100)
    # Keep TextField if you’ll store plain text; switch to JSONField if you’ll store structured steps.
    solution_steps = models.TextField()

    topic = models.CharField(max_length=100, blank=True, default="general")
    difficulty = models.CharField(
        max_length=20,
        choices=[("easy", "Easy"), ("medium", "Medium"), ("hard", "Hard")],
        default="easy",
    )
    number = models.IntegerField(default=0)

    # Mastery & Tracking
    mastery = models.IntegerField(default=0)
    times_asked = models.IntegerField(default=0)
    times_correct = models.IntegerField(default=0)
    time_spent_quiz = models.IntegerField(default=0)  # seconds
    time_spent_read = models.IntegerField(default=0)
    last_practiced = models.DateTimeField(null=True, blank=True)

    # If you also track SRS here, keep as dict
    spaced_repetition = models.JSONField(default=dict)  # e.g., {"interval": 0, "next_review": null}

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Q#{self.id}: {self.question[:50]}..."


class UserWordProgress(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="word_progress"
    )
    word = models.ForeignKey(
        Word, on_delete=models.CASCADE, related_name="user_progress"
    )

    mastery = models.IntegerField(default=0)
    times_correct = models.IntegerField(default=0)
    times_asked = models.IntegerField(default=0)

    last_practiced = models.DateTimeField(null=True, blank=True)
    due_date = models.DateTimeField(null=True, blank=True)

    ease_factor = models.FloatField(default=2.5)
    interval = models.IntegerField(default=1)  # in days
    due_date = models.DateTimeField(null=True, blank=True)
    repetitions = models.IntegerField(default=0)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "word"], name="uniq_user_word_progress"
            )
        ]

    def __str__(self):
        return f"{self.user_id}:{self.word_id} (mastery={self.mastery})"


class ReviewSession(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="review_sessions"
    )
    word = models.ForeignKey(
        Word, on_delete=models.CASCADE, related_name="review_sessions"
    )
    timestamp = models.DateTimeField(auto_now_add=True)
    result = models.BooleanField()  # True=correct, False=incorrect

    def __str__(self):
        return f"Review {self.id} • user={self.user_id} • word={self.word_id} • result={'✓' if self.result else '✗'}"
