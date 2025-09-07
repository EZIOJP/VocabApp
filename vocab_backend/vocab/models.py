# ============================================================================
# FIXED MODELS.PY - Added missing function for migration compatibility
# ============================================================================

from django.db import models
from django.conf import settings
from django.utils import timezone
from datetime import timedelta

# ---------- JSON defaults (migration-safe) ----------

def default_word_breakdown():
    return {"prefix": "", "root": "", "suffix": ""}

def default_examples():
    return []

def default_user_data():
    return {"notes": "", "favorite": False, "user_tags": []}

# ADD BACK FOR MIGRATION COMPATIBILITY
def default_spaced_repetition():
    """Keep for migration compatibility - will be removed later"""
    return {"interval": 0, "next_review": None}

class Word(models.Model):
    """Clean word model - content only, NO user-specific data"""
    word = models.CharField(max_length=100, unique=True)
    pronunciation = models.CharField(max_length=100, blank=True)
    meaning = models.TextField()
    group_number = models.IntegerField(db_index=True)

    # Content fields
    story_mnemonic = models.TextField(blank=True)
    etymology = models.TextField(blank=True)
    word_breakdown = models.JSONField(default=default_word_breakdown)
    category = models.CharField(max_length=50, default="vocabulary")
    difficulty_level = models.CharField(max_length=20, default="medium")
    synonyms = models.JSONField(default=list)
    antonyms = models.JSONField(default=list)
    examples = models.JSONField(default=default_examples)
    tags = models.JSONField(default=list)
    external_links = models.JSONField(default=dict)

    # REMOVE user-specific fields - move to UserWordProgress
    # mastery = REMOVED (will be deprecated in migration)
    # times_asked = REMOVED
    # times_correct = REMOVED
    # last_practiced = REMOVED
    word_grouping = models.JSONField(default=list)
    # Keep for analytics only (global stats)
    total_attempts = models.IntegerField(default=0)
    total_correct = models.IntegerField(default=0)
    source = models.CharField(max_length=100, default="Unknown", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['group_number', 'created_at']
        indexes = [
            models.Index(fields=['group_number']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return self.word

class UserWordProgress(models.Model):
    """THE SINGLE SOURCE OF TRUTH for all user progress"""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                            related_name="word_progress")
    word = models.ForeignKey(Word, on_delete=models.CASCADE,
                            related_name="user_progress")

    # CORE PROGRESS - No lower bound on mastery!
    mastery = models.IntegerField(default=0)  # Can go negative indefinitely
    times_asked = models.IntegerField(default=0)
    times_correct = models.IntegerField(default=0)
    consecutive_correct = models.IntegerField(default=0)  # Track streaks

    # TIMING
    first_seen = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    last_practiced = models.DateTimeField(auto_now=True)
    due_date = models.DateTimeField(null=True, blank=True)

    # SPACED REPETITION - Simplified system
    interval_days = models.IntegerField(default=1)
    review_count = models.IntegerField(default=0)

    # STATUS TRACKING
    is_learning = models.BooleanField(default=True)  # False when mastered
    marked_for_review = models.BooleanField(default=False)

    class Meta:
        unique_together = ['user', 'word']
        indexes = [
            models.Index(fields=['user', 'mastery']),
            models.Index(fields=['user', 'due_date']),
            models.Index(fields=['user', 'is_learning']),
        ]

    def __str__(self):
        return f"{self.user.username}:{self.word.word} (mastery={self.mastery})"

    @property
    def accuracy_rate(self):
        if self.times_asked == 0:
            return 0
        return (self.times_correct / self.times_asked) * 100

    def is_due_for_review(self):
        """Check if word is due for spaced repetition"""
        if not self.due_date:
            return False
        return timezone.now() >= self.due_date

    def calculate_next_due_date(self):
        """Smart spaced repetition based on mastery level"""
        if self.mastery < 0:
            return timezone.now() + timedelta(days=1)  # Practice daily
        elif self.mastery <= 2:
            return timezone.now() + timedelta(days=2)  # Every 2 days
        elif self.mastery <= 5:
            return timezone.now() + timedelta(days=7)  # Weekly
        elif self.mastery <= 8:
            return timezone.now() + timedelta(days=21)  # Every 3 weeks
        else:
            return timezone.now() + timedelta(days=60)  # Every 2 months

    def update_mastery(self, is_correct):
        """Update mastery with your preferred scoring system"""
        if is_correct:
            self.mastery += 1
            self.times_correct += 1
            self.consecutive_correct += 1
        else:
            self.mastery -= 2  # No lower bound!
            self.consecutive_correct = 0

        self.times_asked += 1

        # Auto-schedule for spaced repetition if doing well
        if self.mastery >= 3 and is_correct:
            self.due_date = self.calculate_next_due_date()
            self.marked_for_review = True

        # Mark as learning if struggling
        self.is_learning = self.mastery < 6
        self.save()

class GroupProgress(models.Model):
    """Track user completion of word groups"""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                            related_name="group_progress")
    group_number = models.IntegerField()

    # COMPLETION TRACKING
    is_completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    mastery_threshold = models.IntegerField(default=3)

    # PROGRESS STATS
    words_total = models.IntegerField(default=0)
    words_started = models.IntegerField(default=0)
    words_mastered = models.IntegerField(default=0)

    # TIMING
    started_at = models.DateTimeField(auto_now_add=True)
    last_activity = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['user', 'group_number']
        indexes = [
            models.Index(fields=['user', 'is_completed']),
            models.Index(fields=['user', 'group_number']),
        ]

    def check_and_update_completion(self):
        """Check if all words in group meet mastery threshold"""
        group_words = Word.objects.filter(group_number=self.group_number)
        self.words_total = group_words.count()

        progress_records = UserWordProgress.objects.filter(
            user=self.user,
            word__in=group_words
        )

        self.words_started = progress_records.count()
        self.words_mastered = progress_records.filter(
            mastery__gte=self.mastery_threshold
        ).count()

        # Check completion
        is_now_complete = (self.words_mastered >= self.words_total and
                          self.words_total > 0)

        if is_now_complete and not self.is_completed:
            self.is_completed = True
            self.completed_at = timezone.now()

            # Schedule all words for spaced repetition
            for progress in progress_records:
                if progress.mastery >= self.mastery_threshold:
                    progress.due_date = progress.calculate_next_due_date()
                    progress.marked_for_review = True
                    progress.save()

        self.save()
        return is_now_complete

class QuizSession(models.Model):
    """Enhanced quiz session with retry queue system"""
    QUIZ_TYPES = [
        ('adaptive_group', 'Adaptive Group Quiz'),
        ('spaced_review', 'Spaced Repetition Review'),
        ('low_mastery', 'Low Mastery Drill'),
        ('cycle_mode', 'Cycle Mode Quiz'),
        ('due_review', 'Due Review Quiz'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                            related_name="quiz_sessions")
    quiz_type = models.CharField(max_length=20, choices=QUIZ_TYPES)

    # SESSION SCOPE
    group_number = models.IntegerField(null=True, blank=True)
    word_ids = models.JSONField(default=list)  # Specific words for this session

    # SESSION STATE
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    # PROGRESS TRACKING
    total_questions = models.IntegerField(default=0)
    correct_answers = models.IntegerField(default=0)
    unique_words_practiced = models.IntegerField(default=0)

    # RETRY QUEUE SYSTEM - Your key requirement!
    retry_queue = models.JSONField(default=list)  # [word_id, word_id, ...]
    retry_requirements = models.JSONField(default=dict)  # {word_id: consecutive_needed}

    # RESULTS
    words_mastered_this_session = models.IntegerField(default=0)
    group_completed = models.BooleanField(default=False)

    class Meta:
        indexes = [
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['user', 'quiz_type']),
        ]

    @property
    def accuracy_rate(self):
        if self.total_questions == 0:
            return 0
        return (self.correct_answers / self.total_questions) * 100

    def add_to_retry_queue(self, word_id, required_consecutive=2):
        """Add word to retry queue - needs consecutive correct answers"""
        if word_id not in self.retry_queue:
            self.retry_queue.append(word_id)
        
        # Set requirement for consecutive correct answers
        self.retry_requirements[str(word_id)] = required_consecutive
        self.save()

    def check_retry_completion(self, word_id, consecutive_correct):
        """Check if word can be removed from retry queue"""
        required = self.retry_requirements.get(str(word_id), 2)
        
        if consecutive_correct >= required:
            if word_id in self.retry_queue:
                self.retry_queue.remove(word_id)
            if str(word_id) in self.retry_requirements:
                del self.retry_requirements[str(word_id)]
            self.save()
            return True
        return False

class QuizAttempt(models.Model):
    """Individual quiz attempts with enhanced tracking"""
    session = models.ForeignKey(QuizSession, on_delete=models.CASCADE,
                               related_name="attempts")
    word = models.ForeignKey(Word, on_delete=models.CASCADE)

    # ATTEMPT DATA
    user_answer = models.TextField()
    correct_answer = models.TextField()
    is_correct = models.BooleanField()
    is_retry_attempt = models.BooleanField(default=False)

    # MASTERY TRACKING - FIXED SYNTAX ERROR
    mastery_before = models.IntegerField(default=0)
    mastery_after = models.IntegerField(default=0)
    consecutive_correct_before = models.IntegerField(default=0)
    consecutive_correct_after = models.IntegerField(default=0)

    # TIMING
    timestamp = models.DateTimeField(auto_now_add=True)
    time_taken_ms = models.IntegerField(default=0)
    question_order = models.IntegerField(default=0)

    # OPTIONS PRESENTED (for multiple choice)
    options_presented = models.JSONField(default=list)

    class Meta:
        indexes = [
            models.Index(fields=['session', 'timestamp']),
            models.Index(fields=['word', 'is_correct']),
        ]

# Keep existing models for compatibility
class ReviewSession(models.Model):
    """Keep for spaced repetition compatibility"""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                            related_name="review_sessions")
    word = models.ForeignKey(Word, on_delete=models.CASCADE,
                            related_name="review_sessions")
    timestamp = models.DateTimeField(auto_now_add=True)
    result = models.BooleanField()

class UserStreak(models.Model):
    """Gamification - daily streaks"""
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                               related_name="streak")
    current_streak = models.IntegerField(default=0)
    longest_streak = models.IntegerField(default=0)
    last_quiz_date = models.DateField(null=True, blank=True)
    total_quizzes = models.IntegerField(default=0)

    def update_streak(self):
        """Update daily streak based on quiz activity"""
        today = timezone.now().date()
        
        if self.last_quiz_date == today:
            # Already quizzed today
            return
        elif self.last_quiz_date == today - timedelta(days=1):
            # Consecutive day
            self.current_streak += 1
        else:
            # Streak broken
            self.current_streak = 1

        self.longest_streak = max(self.longest_streak, self.current_streak)
        self.last_quiz_date = today
        self.total_quizzes += 1
        self.save()

# Keep existing models for backward compatibility during transition
class MathQuestion(models.Model):
    """Math questions - keep existing structure"""
    question = models.TextField()
    answer = models.CharField(max_length=100)
    solution_steps = models.TextField()
    topic = models.CharField(max_length=100, blank=True, default="general")
    difficulty = models.CharField(
        max_length=20,
        choices=[("easy", "Easy"), ("medium", "Medium"), ("hard", "Hard")],
        default="easy",
    )
    number = models.IntegerField(default=0)

    # Keep existing fields for compatibility
    mastery = models.IntegerField(default=1)
    times_asked = models.IntegerField(default=0)
    times_correct = models.IntegerField(default=0)
    time_spent_quiz = models.IntegerField(default=0)
    time_spent_read = models.IntegerField(default=0)
    last_practiced = models.DateTimeField(null=True, blank=True)
    spaced_repetition = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Q#{self.id}: {self.question[:50]}..."