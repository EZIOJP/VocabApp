# ============================================================================
# COMPLETE REFACTORED VIEWS.PY - FIXED
# ============================================================================

from django.utils import timezone
from django.contrib.auth.models import User
from rest_framework import status, generics, permissions, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.db.models import  F, FloatField,Count, Q, Avg, Sum, F,Count
from django.db import transaction
import random
from datetime import date, timedelta
from django.db.models import FloatField, ExpressionWrapper
from .models import (
    Word, UserWordProgress, GroupProgress, QuizSession,
    QuizAttempt, ReviewSession, UserStreak, MathQuestion
)

from .serializers import (
    WordSerializer, UserWordProgressSerializer, GroupProgressSerializer,
    QuizSessionSerializer, QuizAttemptSerializer, ReviewSessionSerializer,
    UserStreakSerializer, MathQuestionSerializer, DashboardStatsSerializer,
    QuizReportSerializer, WordWithProgressSerializer
)

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

GROUP_SIZE = 30

def get_active_user(request):
    """Get authenticated user or fallback to demo user"""
    if request.user and request.user.is_authenticated:
        return request.user
    user, _ = User.objects.get_or_create(username="demo")
    return user

def build_adaptive_word_queue(user, quiz_type, group_number=None, word_ids=None):
    """Build priority-based word queue for adaptive learning"""
    # Base queryset
    if word_ids:
        # Specific word IDs (for due review, low mastery, etc.)
        words = Word.objects.filter(id__in=word_ids)
    elif group_number:
        # Group-specific
        words = Word.objects.filter(group_number=group_number)
    else:
        # All words
        words = Word.objects.all()

    # Get user progress for these words
    progress_map = {}
    progress_records = UserWordProgress.objects.filter(
        user=user, word__in=words
    ).select_related('word')

    for progress in progress_records:
        progress_map[progress.word_id] = progress

    # Build priority queue
    word_queue = []
    for word in words:
        progress = progress_map.get(word.id)
        
        if not progress:
            # Unstudied word - HIGH priority
            priority = 1000
            mastery = 0
        else:
            mastery = progress.mastery
            # Priority based on your requirements:
            if mastery <= 0:
                priority = 500 + abs(mastery)  # Negative mastery = HIGHEST priority
            elif mastery <= 2:
                priority = 300 + (3 - mastery)
            elif mastery <= 5:
                priority = 100 + (6 - mastery)
            else:
                priority = 10  # Low priority for mastered words

            # Boost priority if due for review
            if progress.is_due_for_review():
                priority += 200

            # Boost priority for poor accuracy
            if progress.accuracy_rate < 50 and progress.times_asked > 0:
                priority += 100

        word_queue.append({
            'word': word,
            'priority': priority,
            'mastery': mastery,
            'progress': progress
        })

    # Sort by priority (highest first)
    word_queue.sort(key=lambda x: x['priority'], reverse=True)
    return word_queue

def get_next_question_word(session):
    """Get next word for quiz using retry queue + priority system"""
    # 1. FIRST PRIORITY: Retry queue
    if session.retry_queue:
        retry_word_id = session.retry_queue[0]  # Get first word in retry queue
        try:
            return Word.objects.get(id=retry_word_id)
        except Word.DoesNotExist:
            # Remove invalid word from retry queue
            session.retry_queue.remove(retry_word_id)
            session.save()

    # 2. SECOND PRIORITY: Build adaptive queue
    asked_word_ids = set(
        QuizAttempt.objects.filter(session=session)
        .values_list('word_id', flat=True)
    )

    # Get word queue based on session type
    if session.word_ids:
        # Specific word IDs
        word_queue = build_adaptive_word_queue(
            session.user, session.quiz_type, word_ids=session.word_ids
        )
    elif session.group_number:
        # Group-based
        word_queue = build_adaptive_word_queue(
            session.user, session.quiz_type, group_number=session.group_number
        )
    else:
        # All words
        word_queue = build_adaptive_word_queue(session.user, session.quiz_type)

    # Find next unanswered word
    for item in word_queue:
        if item['word'].id not in asked_word_ids:
            return item['word']

    return None  # No more questions

def generate_quiz_options(correct_word, all_words=None):
    """Generate 4 multiple choice options"""
    if not all_words:
        all_words = list(Word.objects.exclude(id=correct_word.id))

    # Get 3 random distractors
    distractors = random.sample(
        [w for w in all_words if w.id != correct_word.id and w.meaning.strip()],
        min(3, len(all_words) - 1)
    )

    # Create options
    options = [correct_word.meaning] + [w.meaning for w in distractors]
    random.shuffle(options)
    return options

# ============================================================================
# NEW ADAPTIVE QUIZ SYSTEM - Your main system
# ============================================================================

@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def quiz_dashboard(request):
    """Comprehensive dashboard - your learning command center"""
    user = get_active_user(request)

    # OVERALL PROGRESS
    total_groups = Word.objects.values('group_number').distinct().count()
    completed_groups = GroupProgress.objects.filter(
        user=user, is_completed=True
    ).count()
    
    current_group = GroupProgress.objects.filter(
        user=user, is_completed=False
    ).order_by('group_number').first()

    # MASTERY DISTRIBUTION (Your specific requirements)
    mastery_stats = UserWordProgress.objects.filter(user=user).aggregate(
        struggling=Count('id', filter=Q(mastery__lt=0)),  # Negative mastery
        learning=Count('id', filter=Q(mastery__range=(0, 2))),  # 0-2
        practicing=Count('id', filter=Q(mastery__range=(3, 5))),  # 3-5
        mastered=Count('id', filter=Q(mastery__gte=6)),  # 6+
        total_studied=Count('id')
    )

    # DUE REVIEWS (Spaced repetition)
    due_words = UserWordProgress.objects.filter(
        user=user,
        due_date__lte=timezone.now(),
        marked_for_review=True
    )

    due_count = due_words.count()
    due_word_ids = list(due_words.values_list('word_id', flat=True)[:20])

    # LOW MASTERY WORDS (Your priority)
    low_mastery_words = UserWordProgress.objects.filter(
        user=user, mastery__lte=0
    )

    low_mastery_count = low_mastery_words.count()
    low_mastery_word_ids = list(low_mastery_words.values_list('word_id', flat=True)[:20])

    # RECENT PERFORMANCE (Last 7 days)
    week_ago = timezone.now() - timezone.timedelta(days=7)
    # Method 1: Calculate average accuracy separately
    completed_sessions = QuizSession.objects.filter(
        user=user,
        started_at__gte=week_ago,
        completed_at__isnull=False
    )

    # Get basic aggregates first
    recent_performance = completed_sessions.aggregate(
        sessions_count=Count('id'),
        total_questions=Sum('total_questions'),
        total_correct=Sum('correct_answers'),
        words_mastered=Sum('words_mastered_this_session')
    )

    # Calculate average accuracy separately
    accuracy_data = completed_sessions.exclude(
        total_questions=0
    ).aggregate(
        avg_accuracy=Avg(
            ExpressionWrapper(
                F('correct_answers') * 100.0 / F('total_questions'),
                output_field=FloatField()
            )
        )
    )

    # Combine the results
    recent_performance['avg_accuracy'] = accuracy_data.get('avg_accuracy', 0)

    # CURRENT GROUP DETAIL
    current_group_detail = None
    if current_group:
        current_group.check_and_update_completion()  # Update stats
        current_group_detail = {
            'group_number': current_group.group_number,
            'words_total': current_group.words_total,
            'words_started': current_group.words_started,
            'words_mastered': current_group.words_mastered,
            'completion_percentage': (
                (current_group.words_mastered / max(current_group.words_total, 1)) * 100
            ),
            'mastery_threshold': current_group.mastery_threshold,
            'is_completed': current_group.is_completed
        }

    # NEXT RECOMMENDED ACTIONS
    next_actions = []
    if due_count > 0:
        next_actions.append({
            'action': 'due_review',
            'title': f'{due_count} words due for review',
            'priority': 'high',
            'word_ids': due_word_ids
        })

    if low_mastery_count > 0:
        next_actions.append({
            'action': 'low_mastery_drill',
            'title': f'{low_mastery_count} struggling words need practice',
            'priority': 'high',
            'word_ids': low_mastery_word_ids
        })

    if current_group and current_group_detail['completion_percentage'] < 100:
        next_actions.append({
            'action': 'continue_group',
            'title': f'Continue Group {current_group.group_number}',
            'priority': 'medium',
            'group_number': current_group.group_number
        })

    # STREAK INFO
    try:
        streak = UserStreak.objects.get(user=user)
        streak_info = UserStreakSerializer(streak).data
    except UserStreak.DoesNotExist:
        streak_info = {'current_streak': 0, 'longest_streak': 0, 'total_quizzes': 0}

    return Response({
        'overall_progress': {
            'completed_groups': completed_groups,
            'total_groups': total_groups,
            'completion_percentage': (completed_groups / max(total_groups, 1)) * 100
        },
        'mastery_distribution': mastery_stats,
        'due_reviews': {
            'count': due_count,
            'word_ids': due_word_ids
        },
        'low_mastery': {
            'count': low_mastery_count,
            'word_ids': low_mastery_word_ids
        },
        'current_group': current_group_detail,
        'recent_performance': recent_performance,
        'streak': streak_info,
        'next_actions': next_actions
    })

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def start_adaptive_quiz(request):
    """Start any type of adaptive quiz"""
    user = get_active_user(request)
    quiz_type = request.data.get('quiz_type', 'adaptive_group')
    group_number = request.data.get('group_number')
    word_ids = request.data.get('word_ids', [])  # For due reviews, low mastery, etc.

    # Create quiz session
    session = QuizSession.objects.create(
        user=user,
        quiz_type=quiz_type,
        group_number=group_number,
        word_ids=word_ids
    )

    # Get preview stats
    if word_ids:
        word_count = len(word_ids)
        message = f"Starting {quiz_type} with {word_count} words"
    elif group_number:
        word_count = Word.objects.filter(group_number=group_number).count()
        message = f"Starting Group {group_number} quiz ({word_count} words)"
    else:
        word_count = Word.objects.count()
        message = f"Starting adaptive quiz ({word_count} words available)"

    return Response({
        'session_id': session.id,
        'quiz_type': quiz_type,
        'word_count': word_count,
        'message': message,
        'started_at': session.started_at
    })

@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def get_adaptive_question(request, session_id):
    """Get next question with your retry queue system"""
    user = get_active_user(request)
    try:
        session = QuizSession.objects.get(id=session_id, user=user)
    except QuizSession.DoesNotExist:
        return Response({'error': 'Session not found'}, status=404)

    # Check if session should end
    current_word = get_next_question_word(session)
    if not current_word:
        # Check if retry queue is empty and group is complete
        if not session.retry_queue:
            if session.group_number:
                # Check group completion
                group_progress, _ = GroupProgress.objects.get_or_create(
                    user=user,
                    group_number=session.group_number,
                    defaults={'mastery_threshold': 3}
                )

                is_complete = group_progress.check_and_update_completion()
                return Response({
                    'session_complete': True,
                    'group_completed': is_complete,
                    'message': 'Group completed!' if is_complete else 'No more questions for now.'
                })
            else:
                return Response({
                    'session_complete': True,
                    'message': 'Quiz completed!'
                })

    # Generate question options
    all_words = list(Word.objects.all())  # Cache for option generation
    options = generate_quiz_options(current_word, all_words)

    # Check if this is a retry question
    is_retry = current_word.id in session.retry_queue

    # Get user progress for context
    try:
        progress = UserWordProgress.objects.get(user=user, word=current_word)
        current_mastery = progress.mastery
        consecutive_correct = progress.consecutive_correct
    except UserWordProgress.DoesNotExist:
        current_mastery = 0
        consecutive_correct = 0

    return Response({
        'word_id': current_word.id,
        'word': current_word.word,
        'pronunciation': current_word.pronunciation,
        'options': options,
        'is_retry': is_retry,
        'current_mastery': current_mastery,
        'consecutive_correct': consecutive_correct,
        'session_stats': {
            'total_questions': session.total_questions,
            'correct_answers': session.correct_answers,
            'retry_queue_size': len(session.retry_queue),
            'accuracy_rate': session.accuracy_rate
        }
    })

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def submit_adaptive_answer(request, session_id):
    """Submit answer with your dual-correct retry system"""
    user = get_active_user(request)
    try:
        session = QuizSession.objects.get(id=session_id, user=user)
    except QuizSession.DoesNotExist:
        return Response({'error': 'Session not found'}, status=404)

    word_id = request.data.get('word_id')
    user_answer = request.data.get('answer', '').strip()
    time_taken = request.data.get('time_taken', 0)

    try:
        word = Word.objects.get(id=word_id)
    except Word.DoesNotExist:
        return Response({'error': 'Word not found'}, status=404)

    is_correct = user_answer == word.meaning.strip()

    with transaction.atomic():
        # Get or create progress
        progress, created = UserWordProgress.objects.get_or_create(
            user=user,
            word=word,
            defaults={'mastery': 0}
        )

        # Store before values
        mastery_before = progress.mastery
        consecutive_before = progress.consecutive_correct

        # Update mastery using your system
        progress.update_mastery(is_correct)

        # RETRY QUEUE LOGIC (Your dual-correct system)
        removed_from_retry = False
        added_to_retry = False

        if is_correct:
            # Check if can remove from retry queue (need 2 consecutive correct)
            if word_id in session.retry_queue:
                if session.check_retry_completion(word_id, progress.consecutive_correct):
                    removed_from_retry = True
        else:
            # Add to retry queue if not already there
            if word_id not in session.retry_queue:
                session.add_to_retry_queue(word_id, required_consecutive=2)
                added_to_retry = True

        # Update global word stats
        word.total_attempts += 1
        if is_correct:
            word.total_correct += 1
        word.save()

        # Record attempt
        attempt = QuizAttempt.objects.create(
            session=session,
            word=word,
            user_answer=user_answer,
            correct_answer=word.meaning,
            is_correct=is_correct,
            is_retry_attempt=(word_id in session.retry_queue),
            mastery_before=mastery_before,
            mastery_after=progress.mastery,
            consecutive_correct_before=consecutive_before,
            consecutive_correct_after=progress.consecutive_correct,
            time_taken_ms=time_taken,
            question_order=session.total_questions + 1
        )

        # Update session stats
        session.total_questions += 1
        if is_correct:
            session.correct_answers += 1

        # Check if word was mastered this session
        if progress.mastery >= 6 and mastery_before < 6:
            session.words_mastered_this_session += 1

        session.save()

        # Update user streak
        try:
            streak = UserStreak.objects.get(user=user)
            streak.update_streak()
        except UserStreak.DoesNotExist:
            UserStreak.objects.create(user=user).update_streak()

    return Response({
        'is_correct': is_correct,
        'correct_answer': word.meaning,
        'mastery_before': mastery_before,
        'mastery_after': progress.mastery,
        'consecutive_correct': progress.consecutive_correct,
        'explanation': word.examples[0]['text'] if word.examples else None,
        'retry_status': {
            'added_to_retry': added_to_retry,
            'removed_from_retry': removed_from_retry,
            'in_retry_queue': word_id in session.retry_queue,
            'retry_queue_size': len(session.retry_queue)
        },
        'session_progress': {
            'total_questions': session.total_questions,
            'correct_answers': session.correct_answers,
            'accuracy_rate': session.accuracy_rate,
            'words_mastered': session.words_mastered_this_session
        }
    })

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def complete_adaptive_quiz_session(request, session_id):
    """Complete quiz session and generate comprehensive report"""
    user = get_active_user(request)
    try:
        session = QuizSession.objects.get(id=session_id, user=user)
    except QuizSession.DoesNotExist:
        return Response({'error': 'Session not found'}, status=404)

    with transaction.atomic():
        session.completed_at = timezone.now()
        session.is_active = False
        session.save()

        # Get all attempts for detailed report
        attempts = QuizAttempt.objects.filter(session=session).select_related('word')

        # Generate mastery change summary
        mastery_changes = []
        for attempt in attempts:
            if attempt.mastery_before != attempt.mastery_after:
                mastery_changes.append({
                    'word': attempt.word.word,
                    'before': attempt.mastery_before,
                    'after': attempt.mastery_after,
                    'is_correct': attempt.is_correct
                })

        # Group completion check
        group_completed = False
        if session.group_number:
            group_progress, _ = GroupProgress.objects.get_or_create(
                user=user,
                group_number=session.group_number,
                defaults={'mastery_threshold': 3}
            )

            group_completed = group_progress.check_and_update_completion()
            session.group_completed = group_completed
            session.save()

        # Performance summary
        performance = {
            'total_questions': session.total_questions,
            'correct_answers': session.correct_answers,
            'accuracy_rate': session.accuracy_rate,
            'words_mastered': session.words_mastered_this_session,
            'time_spent': int((session.completed_at - session.started_at).total_seconds()),
            'retry_queue_cleared': len(session.retry_queue) == 0
        }

        # Next recommendations
        next_recommendations = generate_next_recommendations(user, session)

    return Response({
        'session_id': session.id,
        'completed_at': session.completed_at,
        'performance': performance,
        'mastery_changes': mastery_changes,
        'group_completed': group_completed,
        'retry_queue_remaining': len(session.retry_queue),
        'next_recommendations': next_recommendations
    })

def generate_next_recommendations(user, completed_session):
    """Generate what user should do next"""
    recommendations = []

    # Check for due reviews
    due_count = UserWordProgress.objects.filter(
        user=user,
        due_date__lte=timezone.now(),
        marked_for_review=True
    ).count()

    if due_count > 0:
        recommendations.append({
            'action': 'due_review',
            'title': f'{due_count} words ready for review',
            'priority': 'high'
        })

    # Check for low mastery words
    low_mastery_count = UserWordProgress.objects.filter(
        user=user, mastery__lte=0
    ).count()

    if low_mastery_count > 0:
        recommendations.append({
            'action': 'low_mastery_drill',
            'title': f'{low_mastery_count} struggling words need practice',
            'priority': 'high'
        })

    # Check if there are uncompleted groups
    next_group = GroupProgress.objects.filter(
        user=user, is_completed=False
    ).order_by('group_number').first()

    if next_group:
        recommendations.append({
            'action': 'continue_group',
            'title': f'Continue with Group {next_group.group_number}',
            'priority': 'medium'
        })

    return recommendations

# ============================================================================
# MODULAR COMPONENT SUPPORT - For your reusable components
# ============================================================================

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def mark_word_read(request):
    """Mark word as read - seeds it for learning"""
    user = get_active_user(request)
    word_id = request.data.get('word_id')

    if not word_id:
        return Response({'error': 'word_id required'}, status=400)

    try:
        word = Word.objects.get(id=word_id)
    except Word.DoesNotExist:
        return Response({'error': 'Word not found'}, status=404)

    # Get or create progress
    progress, created = UserWordProgress.objects.get_or_create(
        user=user,
        word=word,
        defaults={'mastery': 0}
    )

    # Update group progress if this is first time seeing word
    if created:
        group_progress, _ = GroupProgress.objects.get_or_create(
            user=user,
            group_number=word.group_number,
            defaults={'mastery_threshold': 3}
        )

        group_progress.check_and_update_completion()

    return Response({
        'word_id': word.id,
        'word': word.word,
        'mastery': progress.mastery,
        'first_seen': created
    })

@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def get_words_by_criteria(request):
    """Get words by various criteria - FIXED PAGINATION"""
    user = get_active_user(request)

    # Query parameters
    group_number = request.GET.get('group')
    mastery_max = request.GET.get('mastery_max')
    mastery_min = request.GET.get('mastery_min')
    due_for_review = request.GET.get('due_for_review')
    word_ids = request.GET.get('word_ids')  # Comma-separated
    limit = int(request.GET.get('limit', 30))  # Default to 30
    offset = int(request.GET.get('offset', 0))  # Add offset support

    # STEP 1: Start with base queryset
    if word_ids:
        # Specific word IDs (for due review, etc.)
        ids = [int(id) for id in word_ids.split(',') if id.strip().isdigit()]
        words = Word.objects.filter(id__in=ids)
    elif group_number:
        words = Word.objects.filter(group_number=int(group_number))
    else:
        words = Word.objects.all()

    # STEP 2: Get user progress for these words
    progress_map = {}
    progress_qs = UserWordProgress.objects.filter(
        user=user, word__in=words
    ).select_related('word')

    # Apply mastery filters
    if mastery_max is not None:
        progress_qs = progress_qs.filter(mastery__lte=int(mastery_max))
    if mastery_min is not None:
        progress_qs = progress_qs.filter(mastery__gte=int(mastery_min))
    if due_for_review == 'true':
        progress_qs = progress_qs.filter(
            due_date__lte=timezone.now(),
            marked_for_review=True
        )

    for progress in progress_qs:
        progress_map[progress.word_id] = progress

    # STEP 3: If filtering by mastery/due date, only include words with progress
    if mastery_max is not None or mastery_min is not None or due_for_review == 'true':
        words = words.filter(id__in=progress_map.keys())

    # STEP 4: Count total BEFORE applying pagination
    total_available = words.count()

    # STEP 5: Apply pagination
    words = words[offset:offset + limit]

    # STEP 6: Build response
    result = []
    for word in words:
        progress = progress_map.get(word.id)
        result.append({
            'id': word.id,
            'word': word.word,
            'pronunciation': word.pronunciation,
            'meaning': word.meaning,
            "story_mnemonic": word.story_mnemonic,
            'group_number': word.group_number,
            'examples': word.examples,
            "word_breakdown": word.word_breakdown,
            'mastery': progress.mastery if progress else 0,
            'is_due': progress.is_due_for_review() if progress else False,
            'times_asked': progress.times_asked if progress else 0,
            'times_correct': progress.times_correct if progress else 0,
            'accuracy_rate': progress.accuracy_rate if progress else 0,
            "synonyms": word.synonyms,
            "antonyms": word.antonyms,
            "tags": word.tags,
            "external_links":word.external_links,
            "etymology": word.etymology,
               
        
        
        
        
        
        
        })

    return Response({
        'words': result,
        'pagination': {
            'limit': limit,
            'offset': offset,
            'returned': len(result),
            'total_available': total_available,
            'has_more': (offset + limit) < total_available
        },
        'criteria': {
            'group_number': group_number,
            'mastery_max': mastery_max,
            'mastery_min': mastery_min,
            'due_for_review': due_for_review,
            'word_ids': word_ids
        }
    })

@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def groups_with_progress(request):
    """Get all groups with detailed progress info"""
    user = get_active_user(request)

    # Get all groups
    groups = Word.objects.values('group_number').annotate(
        total_words=Count('id')
    ).order_by('group_number')

    result = []
    for group in groups:
        group_num = group['group_number']

        # Get or create group progress
        group_progress, _ = GroupProgress.objects.get_or_create(
            user=user,
            group_number=group_num,
            defaults={'mastery_threshold': 3}
        )

        # Update completion status
        group_progress.check_and_update_completion()

        result.append({
            'group_number': group_num,
            'total_words': group_progress.words_total,
            'words_started': group_progress.words_started,
            'words_mastered': group_progress.words_mastered,
            'is_completed': group_progress.is_completed,
            'completion_percentage': (
                (group_progress.words_mastered / max(group_progress.words_total, 1)) * 100
            ),
            'mastery_threshold': group_progress.mastery_threshold,
            'started_at': group_progress.started_at,
            'completed_at': group_progress.completed_at
        })

    return Response({'groups': result})

# ============================================================================
# LEGACY ENDPOINTS - Keep for compatibility during transition
# ============================================================================

# Keep your existing endpoints for compatibility
class WordViewSet(viewsets.ModelViewSet):
    queryset = Word.objects.all()
    serializer_class = WordSerializer

class MathQuestionViewSet(viewsets.ModelViewSet):
    queryset = MathQuestion.objects.all()
    serializer_class = MathQuestionSerializer

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

        # Auto-assign group number if not provided
        grp = word_data.get("group_number")
        if not isinstance(grp, int) or grp <= 0:
            current_count = Word.objects.count() + len(result["added"])
            next_group_num = (current_count // GROUP_SIZE) + 1
            word_data["group_number"] = next_group_num

        serializer = WordSerializer(data=word_data)
        if serializer.is_valid():
            serializer.save()
            result["added"].append(word_text)
        else:
            result["failed"].append({
                "word": word_text,
                "reason": "Invalid field(s)",
                "details": serializer.errors
            })

    status_code = status.HTTP_207_MULTI_STATUS if result["failed"] else status.HTTP_201_CREATED
    return Response(result, status=status_code)

# Legacy spaced repetition endpoints
@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def mark_read(request):
    """Legacy endpoint - kept for compatibility"""
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
    """Legacy endpoint - kept for compatibility"""
    user = get_active_user(request)
    now = timezone.now()
    limit = int(request.GET.get("limit", 20))

    qs = UserWordProgress.objects.filter(
        user=user,
        due_date__lte=now
    ).select_related("word")

    items = list(qs[:limit])
    data = UserWordProgressSerializer(items, many=True).data

    return Response({"count": len(data), "results": data}, status=200)

@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def groups_summary(request):
    """Legacy endpoint - kept for compatibility"""
    user = get_active_user(request)

    totals = (
        Word.objects.values("group_number")
        .annotate(total=Count("id"))
        .order_by("group_number")
    )

    total_map = {row["group_number"]: row["total"] for row in totals}

    studied = (
        UserWordProgress.objects.filter(user=user)
        .values("word__group_number")
        .annotate(cnt=Count("id"))
        .order_by("word__group_number")
    )

    studied_map = {row["word__group_number"]: row["cnt"] for row in studied}

    out = []
    for gnum, total in total_map.items():
        s = studied_map.get(gnum, 0)
        out.append({
            "group_number": gnum,
            "total": total,
            "studied": s,
            "remaining": max(0, total - s),
            "complete": (s >= total and total > 0),
        })

    return Response(out, status=200)

@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def group_words(request, group_number: int):
    """Legacy endpoint - kept for compatibility"""
    qs = Word.objects.filter(group_number=group_number).order_by("created_at")
    return Response(WordSerializer(qs, many=True).data, status=200)

@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def user_low_mastery(request):
    """Legacy endpoint - kept for compatibility"""
    user = get_active_user(request)
    threshold = int(request.GET.get("max", 0))

    qs = (
        UserWordProgress.objects
        .filter(user=user, mastery__lte=threshold)
        .select_related("word")
        .order_by("mastery", "word__created_at")
    )

    data = [
        {
            "id": up.word.id,
            "word": up.word.word,
            "mastery": up.mastery,
            "meaning": up.word.meaning,
            "times_asked": up.times_asked,
            "times_correct": up.times_correct
        }
        for up in qs
    ]

    return Response(data, status=200)

# Legacy quiz endpoints (keep the ones that work with old frontend)
@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def start_quiz_session(request):
    """Legacy quiz start - redirect to new system"""
    user = get_active_user(request)
    data = request.data

    # Create new-style session
    session = QuizSession.objects.create(
        user=user,
        quiz_type=data.get('quiz_type', 'adaptive_group'),
        group_number=data.get('group_number')
    )

    return Response({
        'session_id': session.id,
        'quiz_type': session.quiz_type,
        'started_at': session.started_at
    }, status=201)

@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def get_quiz_question(request, session_id):
    """Legacy quiz question - redirect to new system"""
    return get_adaptive_question(request, session_id)

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def submit_quiz_answer(request, session_id):
    """Legacy quiz answer - redirect to new system"""
    return submit_adaptive_answer(request, session_id)

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def complete_quiz_session(request, session_id):
    """Legacy quiz completion - redirect to new system"""
    return complete_adaptive_quiz_session(request, session_id)

# User progress CRUD (keep for compatibility)
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
