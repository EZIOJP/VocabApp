from rest_framework.viewsets import ModelViewSet
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .models import MathQuestion
from .serializers import MathQuestionSerializer
from .models import Word
from .serializers import WordSerializer


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
class MathQuestionViewSet(ModelViewSet):
    queryset = MathQuestion.objects.all()
    serializer_class = MathQuestionSerializer   
