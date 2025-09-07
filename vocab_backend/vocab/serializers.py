# ============================================================================
# COMPLETE REFACTORED SERIALIZERS.PY
# ============================================================================

from rest_framework import serializers
from django.utils import timezone
from .models import (
    Word, UserWordProgress, ReviewSession, MathQuestion,
    QuizSession, QuizAttempt, UserStreak, GroupProgress
)

class WordSerializer(serializers.ModelSerializer):
    class Meta:
        model = Word
        fields = '__all__'

    # ---- Validations for Word fields ----
    def validate_examples(self, value):
        """
        Must be a list of dicts with:
        text: str (required)
        tags: list[str] (optional, default [])
        style: str (optional)
        """
        if not isinstance(value, list):
            raise serializers.ValidationError("Examples must be a list.")
        
        for i, item in enumerate(value):
            if not isinstance(item, dict):
                raise serializers.ValidationError(f"Example #{i+1} must be an object.")
            if "text" not in item or not isinstance(item["text"], str) or not item["text"].strip():
                raise serializers.ValidationError(f"Example #{i+1} is missing a valid 'text'.")
            if "tags" in item and not isinstance(item["tags"], list):
                raise serializers.ValidationError(f"Example #{i+1} 'tags' must be an array.")
        
        return value

    def validate_external_links(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("External links must be an object.")
        return value

class UserWordProgressSerializer(serializers.ModelSerializer):
    accuracy_rate = serializers.ReadOnlyField()
    is_due_for_review = serializers.ReadOnlyField()
    word_text = serializers.CharField(source='word.word', read_only=True)
    word_meaning = serializers.CharField(source='word.meaning', read_only=True)
    
    class Meta:
        model = UserWordProgress
        fields = [
            'id', 'user', 'word', 'word_text', 'word_meaning',
            'mastery', 'times_asked', 'times_correct', 'consecutive_correct',
            'first_seen', 'last_practiced', 'due_date', 'interval_days',
            'review_count', 'is_learning', 'marked_for_review',
            'accuracy_rate', 'is_due_for_review'
        ]
        read_only_fields = [
            'first_seen', 'last_practiced', 'accuracy_rate', 'is_due_for_review'
        ]

class GroupProgressSerializer(serializers.ModelSerializer):
    completion_percentage = serializers.SerializerMethodField()
    
    class Meta:
        model = GroupProgress
        fields = [
            'id', 'user', 'group_number', 'is_completed', 'completed_at',
            'mastery_threshold', 'words_total', 'words_started', 'words_mastered',
            'started_at', 'last_activity', 'completion_percentage'
        ]
        read_only_fields = ['started_at', 'last_activity', 'completion_percentage']
    
    def get_completion_percentage(self, obj):
        if obj.words_total == 0:
            return 0
        return round((obj.words_mastered / obj.words_total) * 100, 2)

class QuizSessionSerializer(serializers.ModelSerializer):
    accuracy_rate = serializers.ReadOnlyField()
    retry_queue_size = serializers.SerializerMethodField()
    
    class Meta:
        model = QuizSession
        fields = [
            'id', 'user', 'quiz_type', 'group_number', 'word_ids',
            'started_at', 'completed_at', 'is_active',
            'total_questions', 'correct_answers', 'unique_words_practiced',
            'retry_queue', 'retry_requirements', 'words_mastered_this_session',
            'group_completed', 'accuracy_rate', 'retry_queue_size'
        ]
        read_only_fields = [
            'started_at', 'completed_at', 'retry_queue', 'retry_requirements',
            'accuracy_rate', 'retry_queue_size'
        ]
    
    def get_retry_queue_size(self, obj):
        return len(obj.retry_queue) if obj.retry_queue else 0

class QuizAttemptSerializer(serializers.ModelSerializer):
    word_text = serializers.CharField(source='word.word', read_only=True)
    mastery_change = serializers.SerializerMethodField()
    
    class Meta:
        model = QuizAttempt
        fields = [
            'id', 'session', 'word', 'word_text', 'user_answer', 'correct_answer',
            'is_correct', 'is_retry_attempt', 'mastery_before', 'mastery_after',
            'consecutive_correct_before', 'consecutive_correct_after',
            'timestamp', 'time_taken_ms', 'question_order', 'options_presented',
            'mastery_change'
        ]
    
    def get_mastery_change(self, obj):
        return obj.mastery_after - obj.mastery_before

class ReviewSessionSerializer(serializers.ModelSerializer):
    word_text = serializers.CharField(source='word.word', read_only=True)
    
    class Meta:
        model = ReviewSession
        fields = ['id', 'user', 'word', 'word_text', 'timestamp', 'result']

class UserStreakSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserStreak
        fields = [
            'id', 'user', 'current_streak', 'longest_streak',
            'last_quiz_date', 'total_quizzes'
        ]

class MathQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = MathQuestion
        fields = '__all__'

# ============================================================================
# DASHBOARD-SPECIFIC SERIALIZERS
# ============================================================================

class DashboardGroupSerializer(serializers.Serializer):
    """Serializer for dashboard group summary"""
    group_number = serializers.IntegerField()
    total_words = serializers.IntegerField()
    words_started = serializers.IntegerField()
    words_mastered = serializers.IntegerField()
    completion_percentage = serializers.FloatField()
    is_completed = serializers.BooleanField()

class DashboardStatsSerializer(serializers.Serializer):
    """Serializer for overall dashboard statistics"""
    overall_progress = serializers.DictField()
    mastery_distribution = serializers.DictField()
    due_reviews = serializers.DictField()
    low_mastery = serializers.DictField()
    current_group = DashboardGroupSerializer(allow_null=True)
    recent_performance = serializers.DictField()
    streak = UserStreakSerializer()
    next_actions = serializers.ListField()

class QuizReportSerializer(serializers.Serializer):
    """Serializer for quiz completion reports"""
    session_id = serializers.IntegerField()
    completed_at = serializers.DateTimeField()
    performance = serializers.DictField()
    mastery_changes = serializers.ListField()
    group_completed = serializers.BooleanField()
    retry_queue_remaining = serializers.IntegerField()
    next_recommendations = serializers.ListField()

# ============================================================================
# WORD CRITERIA SERIALIZER (for modular components)
# ============================================================================

class WordWithProgressSerializer(serializers.Serializer):
    """Serializer for words with user progress info"""
    id = serializers.IntegerField()
    word = serializers.CharField()
    pronunciation = serializers.CharField()
    meaning = serializers.CharField()
    group_number = serializers.IntegerField()
    examples = serializers.ListField()
    mastery = serializers.IntegerField()
    is_due = serializers.BooleanField()
    times_asked = serializers.IntegerField()
    times_correct = serializers.IntegerField()
    accuracy_rate = serializers.FloatField()