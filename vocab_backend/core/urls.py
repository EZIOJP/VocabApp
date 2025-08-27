# core/urls.py
from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from vocab.views import (
    WordViewSet,
    low_mastery_words,
    add_words_bulk,
    update_quiz_stats,   # <- this exists
    # Spaced-repetition endpoints
    mark_read,
    reviews_due,
    review_answer,
    # Per-user SR CRUD
    UserWordProgressListCreateView,
    UserWordProgressDetailView,
    ReviewSessionListCreateView,
)

router = DefaultRouter()
router.register(r'words', WordViewSet, basename='word')

urlpatterns = [
    path("admin/", admin.site.urls),

    # Custom SR endpoints
    path("api/words/mark-read/", mark_read, name="mark-read"),
    path("api/reviews/due/", reviews_due, name="reviews-due"),
    path("api/reviews/answer/", review_answer, name="reviews-answer"),

    # Bulk add, low mastery, legacy stats
    path("api/add-words/", add_words_bulk),
    path("api/words/low_mastery/", low_mastery_words),
    path("api/words/<int:pk>/update_quiz_stats/", update_quiz_stats),

    # Per-user SR CRUD
    path("api/userwordprogress/", UserWordProgressListCreateView.as_view()),
    path("api/userwordprogress/<int:pk>/", UserWordProgressDetailView.as_view()),
    path("api/reviewsessions/", ReviewSessionListCreateView.as_view()),

    # Word CRUD (router last, so it doesn’t shadow the above)
    path("api/", include(router.urls)),
]
