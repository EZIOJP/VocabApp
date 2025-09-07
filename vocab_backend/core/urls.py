# ============================================================================
# COMPLETE REFACTORED URLS.PY
# ============================================================================

from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from vocab.views import (
    # Legacy views (keep for compatibility)
    WordViewSet,
    MathQuestionViewSet,
    add_words_bulk,
    
    # NEW ADAPTIVE SYSTEM - Your main system
    quiz_dashboard,
    start_adaptive_quiz,
    get_adaptive_question,
    submit_adaptive_answer,
    complete_adaptive_quiz_session,
    
    # MODULAR COMPONENTS SUPPORT
    mark_word_read,
    get_words_by_criteria,
    groups_with_progress,
    
    # LEGACY ENDPOINTS - Keep for compatibility
    mark_read,
    reviews_due,
    groups_summary,
    group_words,
    user_low_mastery,
    
    # Legacy quiz (redirects to new system)
    start_quiz_session,
    get_quiz_question,
    submit_quiz_answer,
    complete_quiz_session,
    
    # User progress CRUD
    UserWordProgressListCreateView,
    UserWordProgressDetailView,
    ReviewSessionListCreateView,
)

router = DefaultRouter()
router.register(r'words', WordViewSet, basename='word')
router.register(r'mathquestions', MathQuestionViewSet, basename='mathquestion')

urlpatterns = [
    path("admin/", admin.site.urls),
    
    # ============================================================================
    # NEW ADAPTIVE QUIZ SYSTEM - Your main system 🚀
    # ============================================================================
    
    # Central Dashboard - Your learning command center
    path("api/quiz/dashboard/", quiz_dashboard, name="quiz-dashboard"),
    
    # Adaptive Quiz System - Handles ALL quiz types
    path("api/quiz/adaptive/start/", start_adaptive_quiz, name="start-adaptive-quiz"),
    path("api/quiz/adaptive/<int:session_id>/question/", get_adaptive_question, name="get-adaptive-question"),
    path("api/quiz/adaptive/<int:session_id>/answer/", submit_adaptive_answer, name="submit-adaptive-answer"),
    path("api/quiz/adaptive/<int:session_id>/complete/", complete_adaptive_quiz_session, name="complete-adaptive-quiz"),
    
    # ============================================================================
    # MODULAR COMPONENT SUPPORT - For your reusable components 🔧
    # ============================================================================
    
    # Word management for ReadMode, QuizMode combinations
    path("api/words/mark-read/", mark_word_read, name="mark-word-read"),
    path("api/words/by-criteria/", get_words_by_criteria, name="words-by-criteria"),
    path("api/groups/detailed/", groups_with_progress, name="groups-detailed"),
    
    # ============================================================================
    # LEGACY ENDPOINTS - Keep for compatibility during transition 🔄
    # ============================================================================
    
    # Spaced repetition (legacy)
    path("api/words/mark-read-legacy/", mark_read, name="mark-read-legacy"),
    path("api/reviews/due/", reviews_due, name="reviews-due"),
    
    # Groups (legacy)
    path("api/groups/summary/", groups_summary, name="groups-summary"),
    path("api/groups/<int:group_number>/words/", group_words, name="group-words"),
    
    # User-specific queries (legacy)
    path("api/user/low_mastery/", user_low_mastery, name="user-low-mastery"),
    
    # Bulk operations
    path("api/add-words/", add_words_bulk, name="add-words-bulk"),
    
    # ============================================================================
    # LEGACY QUIZ ENDPOINTS - Redirect to new system 🔀
    # ============================================================================
    
    # These redirect to new adaptive system for compatibility
    path("api/quiz/start/", start_quiz_session, name="start-quiz-legacy"),
    path("api/quiz/<int:session_id>/question/", get_quiz_question, name="quiz-question-legacy"),
    path("api/quiz/<int:session_id>/answer/", submit_quiz_answer, name="quiz-answer-legacy"),
    path("api/quiz/<int:session_id>/complete/", complete_quiz_session, name="complete-quiz-legacy"),
    
    # ============================================================================
    # USER PROGRESS CRUD - Keep for compatibility 📊
    # ============================================================================
    
    path("api/userwordprogress/", UserWordProgressListCreateView.as_view(), name="user-progress-list"),
    path("api/userwordprogress/<int:pk>/", UserWordProgressDetailView.as_view(), name="user-progress-detail"),
    path("api/reviewsessions/", ReviewSessionListCreateView.as_view(), name="review-sessions"),
    
    # ============================================================================
    # WORD & MATH CRUD (Router) 📚
    # ============================================================================
    
    path("api/", include(router.urls)),
]

# ============================================================================
# API USAGE EXAMPLES - For your frontend development 💡
# ============================================================================

"""
NEW ADAPTIVE SYSTEM USAGE:

1. GET DASHBOARD:
   GET /api/quiz/dashboard/
   
2. START QUIZ (Multiple types):
   
   # Group-based learning
   POST /api/quiz/adaptive/start/
   {
     "quiz_type": "adaptive_group",
     "group_number": 1
   }
   
   # Due reviews (random word IDs)
   POST /api/quiz/adaptive/start/
   {
     "quiz_type": "due_review", 
     "word_ids": [23, 156, 78, 9, 201]
   }
   
   # Low mastery drill
   POST /api/quiz/adaptive/start/
   {
     "quiz_type": "low_mastery",
     "word_ids": [45, 67, 123]
   }

3. QUIZ FLOW:
   GET /api/quiz/adaptive/{session_id}/question/
   POST /api/quiz/adaptive/{session_id}/answer/
   POST /api/quiz/adaptive/{session_id}/complete/

MODULAR COMPONENTS SUPPORT:

1. GET WORDS BY CRITERIA (Perfect for your components):
   
   # ReadMode + QuizMode for Group 1
   GET /api/words/by-criteria/?group=1
   
   # Low Mastery Loop (mastery ≤ 0) 
   GET /api/words/by-criteria/?mastery_max=0
   
   # Due Reviews (specific word IDs)
   GET /api/words/by-criteria/?word_ids=10,25,67,134&due_for_review=true
   
   # CycleMode combination
   GET /api/words/by-criteria/?group=1&mastery_max=2

2. MARK WORDS AS READ:
   POST /api/words/mark-read/
   {"word_id": 123}

3. GROUP PROGRESS:
   GET /api/groups/detailed/

LEGACY COMPATIBILITY:
- All old endpoints still work
- Old quiz endpoints redirect to new system
- Gradual migration possible
"""