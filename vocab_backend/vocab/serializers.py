from rest_framework import serializers
from .models import Word
from django.utils import timezone
from .models import MathQuestion
class WordSerializer(serializers.ModelSerializer):
    class Meta:
        model = Word
        fields = '__all__'
        
class MathQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = MathQuestion
        fields = '__all__'

    # ------------------ Validations ------------------ #

# def validate_examples(self, value):
#     if not isinstance(value, dict):
#         raise serializers.ValidationError("Examples must be a list.")
#     for item in value:
#         if not isinstance(item, dict):
#             raise serializers.ValidationError("Each example must be a dictionary.")
#         if not {"text", "tags"}.issubset(item.keys()):
#             raise serializers.ValidationError("Each example must include 'text' and 'tag'.")
#     return value


    def validate_external_links(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("External links must be a dictionary.")
        return value

    def validate_user_data(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("User data must be a dictionary.")
        return value

    def validate_spaced_repetition(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("Spaced repetition must be a dictionary.")
        return value

    def validate_mastery(self, value):
        if not isinstance(value, int) or value < 0:
            raise serializers.ValidationError("Mastery must be a non-negative integer.")
        return value

    # ------------------ Create Hook ------------------ #

    def create(self, validated_data):
        validated_data.setdefault('created_at', timezone.now())
        return super().create(validated_data)





