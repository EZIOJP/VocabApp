from rest_framework.viewsets import ModelViewSet
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .models import MathQuestion, Word, UserWordProgress, ReviewSession
from .serializers import MathQuestionSerializer, WordSerializer, UserWordProgressSerializer, ReviewSessionSerializer
from django.utils import timezone
from rest_framework import generics, permissions
from django.contrib.auth import get_user_model


class WordViewSet(ModelViewSet):
    queryset = Word.objects.all()
    serializer_class = WordSerializer



@api_view(['POST'])
def add_words_bulk(request):
    input_data = request.data
    if isinstance(input_data, dict):
        input_data = [input_data]

    result = {"added": [], "failed": []}

    for word_data in input_data:
        word_text = word_data.get("word", "").strip() or "(missing)"
        
        if not word_data.get("word"):
            result["failed"].append({
                "word": word_text,
                "reason": "Missing 'word' field"
            })
            continue

        if Word.objects.filter(word__iexact=word_text).exists():
            result["failed"].append({
                "word": word_text,
                "reason": "Word already exists"
            })
            continue

        serializer = WordSerializer(data=word_data)
        if serializer.is_valid():
            serializer.save()
            result["added"].append(word_text)
        else:
            detailed_errors = []
            for field, field_errors in serializer.errors.items():
                detailed_errors.append({
                    "field": field,
                    "value": word_data.get(field, "(missing)"),
                    "errors": field_errors
                })
            result["failed"].append({
                "word": word_text,
                "reason": "Invalid field(s)",
                "details": detailed_errors
            })

    status_code = status.HTTP_207_MULTI_STATUS if result["failed"] else status.HTTP_201_CREATED
    return Response(result, status=status_code)

def _sanitize_types(data):
    """Attempt to coerce strings into proper types like boolean/int if needed."""
    def parse_value(v):
        if isinstance(v, str):
            v_lower = v.lower()
            if v_lower in ("true", "false"):
                return v_lower == "true"
            if v.isdigit():
                return int(v)
        return v

    return {k: parse_value(v) for k, v in data.items()}

@api_view(['GET'])
def low_mastery_words(request):
    low_words = Word.objects.filter(mastery__lte=2).order_by('mastery')
    serializer = WordSerializer(low_words, many=True)
    return Response(serializer.data)

@api_view(['PUT'])
def update_quiz_stats(request, pk):
    try:
        word = Word.objects.get(pk=pk)
    except Word.DoesNotExist:
        return Response({"error": "Word not found"}, status=status.HTTP_404_NOT_FOUND)

    data = request.data

    # Increment or decrement fields
    if 'correct' in data:
        word.times_asked += 1
        if data['correct']:
            word.times_correct += 1
            word.mastery = min(word.mastery + 1, 5)  # cap max mastery at 5
        else:
            word.mastery = max(word.mastery - 1, 0)  # floor at 0

        word.save()
        return Response(WordSerializer(word).data)

    return Response({"error": "Missing 'correct' field"}, status=status.HTTP_400_BAD_REQUEST)

# --- New Views for UserWordProgress and ReviewSession --- #

class UserWordProgressListCreateView(generics.ListCreateAPIView):
    queryset = UserWordProgress.objects.all()
    serializer_class = UserWordProgressSerializer
    permission_classes = [permissions.IsAuthenticated]

class UserWordProgressDetailView(generics.RetrieveUpdateAPIView):
    queryset = UserWordProgress.objects.all()
    serializer_class = UserWordProgressSerializer
    permission_classes = [permissions.IsAuthenticated]

class ReviewSessionListCreateView(generics.ListCreateAPIView):
    queryset = ReviewSession.objects.all()
    serializer_class = ReviewSessionSerializer
    permission_classes = [permissions.IsAuthenticated]

# --- Custom Endpoints --- #
from rest_framework.decorators import api_view, permission_classes

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def reviews_due(request):
    """Return words due for review for the current user."""
    now = timezone.now()
    due = UserWordProgress.objects.filter(user=request.user, due_date__lte=now)
    serializer = UserWordProgressSerializer(due, many=True)
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def reviews_update(request):
    """Update UserWordProgress after a quiz answer (expects user, word, result)."""
    user = request.user
    word_id = request.data.get('word')
    result = request.data.get('result')  # boolean
    try:
        progress = UserWordProgress.objects.get(user=user, word_id=word_id)
    except UserWordProgress.DoesNotExist:
        return Response({'error': 'Progress not found.'}, status=404)

    # Simple SM-2 spaced repetition update (can be improved)
    import datetime
    if result:
        progress.times_correct += 1
        progress.mastery += 1
        progress.ease_factor = max(1.3, progress.ease_factor + 0.1)
        progress.interval = int(progress.interval * progress.ease_factor)
    else:
        progress.mastery = max(0, progress.mastery - 1)
        progress.ease_factor = max(1.3, progress.ease_factor - 0.2)
        progress.interval = 1
    progress.times_asked += 1
    progress.last_practiced = timezone.now()
    progress.due_date = timezone.now() + datetime.timedelta(days=progress.interval)
    progress.next_review = progress.due_date
    progress.save()

    # Log review session
    ReviewSession.objects.create(user=user, word_id=word_id, result=result)
    return Response(UserWordProgressSerializer(progress).data)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def user_progress(request):
    """Return user's learning stats."""
    user = request.user
    total = UserWordProgress.objects.filter(user=user).count()
    mastered = UserWordProgress.objects.filter(user=user, mastery__gte=5).count()
    due = UserWordProgress.objects.filter(user=user, due_date__lte=timezone.now()).count()
    return Response({
        'total_words': total,
        'mastered_words': mastered,
        'due_reviews': due,
    })
