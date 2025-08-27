# vocab/serializers.py
from rest_framework import serializers
from django.utils import timezone

from .models import Word, UserWordProgress, ReviewSession, MathQuestion


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

    def validate_user_data(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("User data must be an object.")
        return value

    def validate_spaced_repetition(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("Spaced repetition must be an object.")
        # Optional: enforce keys
        # for k in ["interval", "next_review"]:
        #     if k not in value:
        #         raise serializers.ValidationError(f"Missing '{k}' in spaced_repetition.")
        return value

    def validate_mastery(self, value):
        if not isinstance(value, int) or value < 0:
            raise serializers.ValidationError("Mastery must be a non-negative integer.")
        return value


class UserWordProgressSerializer(serializers.ModelSerializer):
    # If you want embedded word basics:
    # from .serializers import WordSerializer   # circular import risk if not careful
    # word = serializers.PrimaryKeyRelatedField(read_only=True)
    class Meta:
        model = UserWordProgress
        fields = '__all__'


class ReviewSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReviewSession
        fields = '__all__'


class MathQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = MathQuestion
        fields = '__all__'
