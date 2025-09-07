# ============================================================================
# REFACTORED ADMIN.PY - Compatible with new models
# ============================================================================

from django.contrib import admin
from .models import (
    Word, UserWordProgress, GroupProgress, QuizSession, 
    QuizAttempt, ReviewSession, UserStreak, MathQuestion
)

# ============================================================================
# WORD ADMIN - Cleaned up for content-only model
# ============================================================================

@admin.register(Word)
class WordAdmin(admin.ModelAdmin):
    list_display = [
        'word', 'pronunciation', 'meaning', 'group_number', 
        'category', 'difficulty_level', 'total_attempts', 'total_correct',
        'created_at'
    ]
    list_filter = [
        'group_number', 'category', 'difficulty_level', 'created_at'
    ]
    search_fields = ['word', 'meaning', 'pronunciation']
    ordering = ['group_number', 'created_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('word', 'pronunciation', 'meaning', 'group_number')
        }),
        ('Content Details', {
            'fields': ('category', 'difficulty_level', 'story_mnemonic', 'etymology'),
            'classes': ('collapse',)
        }),
        ('Word Structure', {
            'fields': ('word_breakdown', 'synonyms', 'antonyms', 'word_grouping'),
            'classes': ('collapse',)
        }),
        ('Examples & Links', {
            'fields': ('examples', 'tags', 'external_links'),
            'classes': ('collapse',)
        }),
        ('Analytics', {
            'fields': ('total_attempts', 'total_correct', 'source'),
            'classes': ('collapse',)
        })
    )
    
    readonly_fields = ['total_attempts', 'total_correct', 'created_at']

# ============================================================================
# USER PROGRESS ADMIN - Updated for new fields
# ============================================================================

@admin.register(UserWordProgress)
class UserWordProgressAdmin(admin.ModelAdmin):
    list_display = [
        'user', 'word', 'mastery', 'times_asked', 'times_correct', 
        'consecutive_correct', 'accuracy_rate', 'is_learning', 
        'marked_for_review', 'last_practiced'
    ]
    list_filter = [
        'mastery', 'is_learning', 'marked_for_review', 
        'word__group_number', 'last_practiced'
    ]
    search_fields = ['user__username', 'word__word']
    ordering = ['-last_practiced']
    
    fieldsets = (
        ('User & Word', {
            'fields': ('user', 'word')
        }),
        ('Progress Tracking', {
            'fields': ('mastery', 'times_asked', 'times_correct', 'consecutive_correct')
        }),
        ('Timing', {
            'fields': ('first_seen', 'last_practiced', 'due_date')
        }),
        ('Spaced Repetition', {
            'fields': ('interval_days', 'review_count', 'is_learning', 'marked_for_review'),
            'classes': ('collapse',)
        })
    )
    
    readonly_fields = ['first_seen', 'last_practiced', 'accuracy_rate']
    
    def accuracy_rate(self, obj):
        return f"{obj.accuracy_rate:.1f}%"
    accuracy_rate.short_description = 'Accuracy'

# ============================================================================
# GROUP PROGRESS ADMIN - New model
# ============================================================================

@admin.register(GroupProgress)
class GroupProgressAdmin(admin.ModelAdmin):
    list_display = [
        'user', 'group_number', 'is_completed', 'words_total', 
        'words_started', 'words_mastered', 'completion_percentage', 
        'completed_at'
    ]
    list_filter = ['is_completed', 'group_number', 'mastery_threshold']
    search_fields = ['user__username']
    ordering = ['user', 'group_number']
    
    readonly_fields = ['started_at', 'last_activity', 'completion_percentage']
    
    def completion_percentage(self, obj):
        if obj.words_total == 0:
            return "0%"
        return f"{(obj.words_mastered / obj.words_total) * 100:.1f}%"
    completion_percentage.short_description = 'Completion %'

# ============================================================================
# QUIZ SESSION ADMIN - Enhanced for new features
# ============================================================================

@admin.register(QuizSession)
class QuizSessionAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'user', 'quiz_type', 'group_number', 'started_at',
        'is_active', 'total_questions', 'correct_answers', 
        'accuracy_rate', 'retry_queue_size', 'group_completed'
    ]
    list_filter = [
        'quiz_type', 'is_active', 'group_completed', 
        'started_at', 'completed_at'
    ]
    search_fields = ['user__username']
    ordering = ['-started_at']
    
    fieldsets = (
        ('Session Info', {
            'fields': ('user', 'quiz_type', 'group_number', 'word_ids')
        }),
        ('Session State', {
            'fields': ('started_at', 'completed_at', 'is_active')
        }),
        ('Progress', {
            'fields': ('total_questions', 'correct_answers', 'unique_words_practiced')
        }),
        ('Retry System', {
            'fields': ('retry_queue', 'retry_requirements'),
            'classes': ('collapse',)
        }),
        ('Results', {
            'fields': ('words_mastered_this_session', 'group_completed'),
            'classes': ('collapse',)
        })
    )
    
    readonly_fields = ['started_at', 'completed_at', 'accuracy_rate', 'retry_queue_size']
    
    def accuracy_rate(self, obj):
        return f"{obj.accuracy_rate:.1f}%"
    accuracy_rate.short_description = 'Accuracy'
    
    def retry_queue_size(self, obj):
        return len(obj.retry_queue) if obj.retry_queue else 0
    retry_queue_size.short_description = 'Retry Queue Size'

# ============================================================================
# QUIZ ATTEMPT ADMIN - Enhanced tracking
# ============================================================================

@admin.register(QuizAttempt)
class QuizAttemptAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'session', 'word', 'is_correct', 'is_retry_attempt',
        'mastery_before', 'mastery_after', 'mastery_change', 
        'consecutive_correct_after', 'timestamp'
    ]
    list_filter = [
        'is_correct', 'is_retry_attempt', 'session__quiz_type',
        'timestamp'
    ]
    search_fields = ['word__word', 'session__user__username']
    ordering = ['-timestamp']
    
    readonly_fields = ['timestamp', 'mastery_change']
    
    def mastery_change(self, obj):
        change = obj.mastery_after - obj.mastery_before
        if change > 0:
            return f"+{change}"
        return str(change)
    mastery_change.short_description = 'Mastery Change'

# ============================================================================
# REVIEW SESSION ADMIN - Keep existing
# ============================================================================

@admin.register(ReviewSession)
class ReviewSessionAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'word', 'result', 'timestamp']
    list_filter = ['result', 'timestamp']
    search_fields = ['user__username', 'word__word']
    ordering = ['-timestamp']

# ============================================================================
# USER STREAK ADMIN - Gamification
# ============================================================================

@admin.register(UserStreak)
class UserStreakAdmin(admin.ModelAdmin):
    list_display = [
        'user', 'current_streak', 'longest_streak', 
        'last_quiz_date', 'total_quizzes'
    ]
    list_filter = ['last_quiz_date']
    search_fields = ['user__username']
    ordering = ['-current_streak']

# ============================================================================
# MATH QUESTION ADMIN - Keep existing structure
# ============================================================================

@admin.register(MathQuestion)
class MathQuestionAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'question', 'answer', 'topic', 'difficulty', 
        'number', 'mastery', 'times_asked', 'times_correct'
    ]
    list_filter = ['topic', 'difficulty', 'created_at']
    search_fields = ['question', 'topic']
    ordering = ['number', 'topic']
    
    fieldsets = (
        ('Question Details', {
            'fields': ('question', 'answer', 'solution_steps')
        }),
        ('Classification', {
            'fields': ('topic', 'difficulty', 'number')
        }),
        ('Progress Tracking', {
            'fields': ('mastery', 'times_asked', 'times_correct', 'time_spent_quiz', 'time_spent_read'),
            'classes': ('collapse',)
        }),
        ('Spaced Repetition', {
            'fields': ('last_practiced', 'spaced_repetition'),
            'classes': ('collapse',)
        })
    )

# ============================================================================
# ADMIN SITE CUSTOMIZATION
# ============================================================================

admin.site.site_header = "Vocabulary Learning System Admin"
admin.site.site_title = "Vocab Admin"
admin.site.index_title = "Welcome to Vocabulary Learning System Administration"

# Add some custom admin actions
def reset_user_progress(modeladmin, request, queryset):
    """Reset selected user progress records"""
    updated = queryset.update(
        mastery=0, 
        times_asked=0, 
        times_correct=0, 
        consecutive_correct=0,
        is_learning=True,
        marked_for_review=False
    )
    modeladmin.message_user(request, f'{updated} progress records reset.')

reset_user_progress.short_description = "Reset selected user progress"

def mark_groups_incomplete(modeladmin, request, queryset):
    """Mark selected groups as incomplete"""
    updated = queryset.update(is_completed=False, completed_at=None)
    modeladmin.message_user(request, f'{updated} groups marked as incomplete.')

mark_groups_incomplete.short_description = "Mark selected groups as incomplete"

# Add actions to admin classes
UserWordProgressAdmin.actions = [reset_user_progress]
GroupProgressAdmin.actions = [mark_groups_incomplete]