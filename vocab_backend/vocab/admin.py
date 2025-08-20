# vocab/admin.py
from django.contrib import admin
from .models import Word

@admin.register(Word)
class WordAdmin(admin.ModelAdmin):
    list_display = ['word', 'category', 'mastery', 'difficulty_level', 'created_at']
    search_fields = ['word', 'meaning', 'story_mnemonic']
