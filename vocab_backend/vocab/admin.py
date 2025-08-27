from django.contrib import admin
from .models import Word, UserWordProgress, ReviewSession, MathQuestion


@admin.register(Word)
class WordAdmin(admin.ModelAdmin):
    list_display = ['word', 'category', 'difficulty_level', 'mastery', 'created_at']
    search_fields = ['word', 'meaning', 'story_mnemonic']
    list_filter = ['category', 'difficulty_level', 'connotation']
    ordering = ['word']


@admin.register(UserWordProgress)
class UserWordProgressAdmin(admin.ModelAdmin):
    list_display = ['user', 'word', 'mastery', 'times_asked', 'times_correct', 'repetitions', 'interval', 'due_date']
    search_fields = ['user_username', 'word_word']
    list_filter = ['mastery']
    ordering = ['due_date']


@admin.register(ReviewSession)
class ReviewSessionAdmin(admin.ModelAdmin):
    list_display = ['user', 'word', 'timestamp', 'result']
    search_fields = ['user_username', 'word_word']
    list_filter = ['result', 'timestamp']


@admin.register(MathQuestion)
class MathQuestionAdmin(admin.ModelAdmin):
    list_display = ['id', 'topic', 'difficulty', 'number', 'created_at']
    search_fields = ['question', 'topic']
    list_filter = ['difficulty', 'topic']

