from django.utils import timezone
from django.contrib.auth.models import User
from rest_framework import status, generics, permissions, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from .models import MathQuestion, Word, UserWordProgress, ReviewSession
from .serializers import (
    MathQuestionSerializer,
    WordSerializer,
    UserWordProgressSerializer,
    ReviewSessionSerializer,
)

# -----------------------
# Helpers
# -----------------------

def get_active_user(request):
    """
    If user is not authenticated, fallback to demo user.
    """
    if request.user and request.user.is_authenticated:
        return request.user
    user, _ = User.objects.get_or_create(username="demo")
    return user


def apply_sm2(progress: UserWordProgress, quality: int, now=None):
    """
    Minimal SM-2 algorithm.
    quality: 0..5 (>=3 = correct)
    """
    if now is None:
        now = timezone.now()

    q = max(0, min(5, int(quality)))
    ef = progress.ease_factor
    ef_new = ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    ef = max(1.3, ef_new)

    if q < 3:  # incorrect
        progress.repetitions = 0
        progress.interval = 1
        progress.mastery = max(0, (progress.mastery or 0) - 1)
    else:  # correct
        progress.repetitions = (progress.repetitions or 0) + 1
        if progress.repetitions == 1:
            progress.interval = 1
        elif progress.repetitions == 2:
            progress.interval = 6
        else:
            progress.interval = round((progress.interval or 1) * ef)
        progress.mastery = (progress.mastery or 0) + 1

    progress.ease_factor = ef
    progress.times_asked = (progress.times_asked or 0) + 1
    if q >= 3:
        progress.times_correct = (progress.times_correct or 0) + 1
    progress.last_practiced = now
    progress.due_date = now + timezone.timedelta(days=progress.interval)
    return progress


# -----------------------
# Word CRUD
# -----------------------

class WordViewSet(viewsets.ModelViewSet):
    queryset = Word.objects.all()
    serializer_class = WordSerializer


# -----------------------
# MathQuestion CRUD
# -----------------------

class MathQuestionViewSet(viewsets.ModelViewSet):
    queryset = MathQuestion.objects.all()
    serializer_class = MathQuestionSerializer


# -----------------------
# Bulk add words
# -----------------------

@api_view(['POST'])
def add_words_bulk(request):
    input_data = request.data
    if isinstance(input_data, dict):
        input_data = [input_data]

    result = {"added": [], "failed": []}

    for word_data in input_data:
        word_text = (word_data.get("word") or "").strip() or "(missing)"

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


# -----------------------
# Low mastery words
# -----------------------

@api_view(['GET'])
def low_mastery_words(request):
    low_words = Word.objects.filter(mastery__lte=2).order_by('mastery')
    serializer = WordSerializer(low_words, many=True)
    return Response(serializer.data)


# -----------------------
# Legacy quiz stats (global)
# -----------------------

@api_view(['PUT'])
def update_quiz_stats(request, pk):
    try:
        word = Word.objects.get(pk=pk)
    except Word.DoesNotExist:
        return Response({"error": "Word not found"}, status=status.HTTP_404_NOT_FOUND)

    data = request.data

    if 'correct' in data:
        word.times_asked = (word.times_asked or 0) + 1
        if data['correct']:
            word.times_correct = (word.times_correct or 0) + 1
            word.mastery = min((word.mastery or 0) + 1, 5)
        else:
            word.mastery = max((word.mastery or 0) - 1, 0)

        word.save()
        return Response(WordSerializer(word).data)

    return Response({"error": "Missing 'correct' field"}, status=status.HTTP_400_BAD_REQUEST)


# -----------------------
# User progress + reviews
# -----------------------

class UserWordProgressListCreateView(generics.ListCreateAPIView):
    serializer_class = UserWordProgressSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        user = get_active_user(self.request)
        return UserWordProgress.objects.filter(user=user)

    def perform_create(self, serializer):
        user = get_active_user(self.request)
        serializer.save(user=user)


class UserWordProgressDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = UserWordProgressSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        user = get_active_user(self.request)
        return UserWordProgress.objects.filter(user=user)


class ReviewSessionListCreateView(generics.ListCreateAPIView):
    serializer_class = ReviewSessionSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        user = get_active_user(self.request)
        return ReviewSession.objects.filter(user=user)

    def perform_create(self, serializer):
        user = get_active_user(self.request)
        serializer.save(user=user)


# -----------------------
# New SR endpoints
# -----------------------

@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def mark_read(request):
    """
    Body: { "word_id": <int> }
    Seeds progress for the user with due_date=now if missing.
    """
    user = get_active_user(request)
    word_id = request.data.get("word_id")
    if not word_id:
        return Response({"detail": "word_id required"}, status=400)
    try:
        word = Word.objects.get(id=word_id)
    except Word.DoesNotExist:
        return Response({"detail": "Word not found"}, status=404)

    uwp, _ = UserWordProgress.objects.get_or_create(
        user=user, word=word, defaults={"due_date": timezone.now()}
    )
    return Response(UserWordProgressSerializer(uwp).data, status=200)


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def reviews_due(request):
    """
    GET ?limit=20&bucket=today|yesterday|last7days|older
    Returns prioritized due items for the user.
    """
    user = get_active_user(request)
    now = timezone.now()
    limit = int(request.GET.get("limit", 20))
    bucket = request.GET.get("bucket")

    qs = UserWordProgress.objects.filter(user=user)
    if bucket == "yesterday":
        day = (now - timezone.timedelta(days=1)).date()
        qs = qs.filter(due_date__date=day)
    elif bucket == "last7days":
        qs = qs.filter(
            due_date__lte=now,
            due_date__gte=now - timezone.timedelta(days=7)
        )
    elif bucket == "older":
        qs = qs.filter(due_date__lt=now - timezone.timedelta(days=7))
    else:
        qs = qs.filter(due_date__lte=now)

    items = list(qs.select_related("word"))

    # priority score
    def priority(u):
        overdue_days = 0
        if u.due_date:
            overdue_days = max(0, int((now - u.due_date).total_seconds() // 86400))
        mastery_gap = max(0, 2 - (u.mastery or 0))
        reps_gap = max(0, 3 - (u.repetitions or 0))
        return 2.0 * overdue_days + 1.5 * mastery_gap + 0.5 * reps_gap

    items.sort(key=priority, reverse=True)
    items = items[:limit]
    data = UserWordProgressSerializer(items, many=True).data
    return Response({"count": len(data), "results": data}, status=200)


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def review_answer(request):
    """
    Body: { "word_id": <int>, "quality": 0..5, "latency_ms": <int optional> }
    Applies SM-2, logs ReviewSession, returns updated progress.
    """
    user = get_active_user(request)
    word_id = request.data.get("word_id")
    quality = request.data.get("quality")

    if word_id is None or quality is None:
        return Response({"detail": "word_id and quality required"}, status=400)

    try:
        uwp = UserWordProgress.objects.select_related("word").get(user=user, word_id=word_id)
    except UserWordProgress.DoesNotExist:
        return Response({"detail": "Progress not found. Seed it via mark_read."}, status=404)

    apply_sm2(uwp, int(quality), now=timezone.now())
    uwp.save()

    ReviewSession.objects.create(
        user=user,
        word=uwp.word,
        result=(int(quality) >= 3),
    )
    return Response(UserWordProgressSerializer(uwp).data, status=200)