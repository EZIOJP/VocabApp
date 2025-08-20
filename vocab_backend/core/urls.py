"""
URL configuration for core project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from vocab.views import (
    WordViewSet, low_mastery_words, add_words_bulk,
    update_quiz_stats, UserWordProgressListCreateView, UserWordProgressDetailView,
    ReviewSessionListCreateView, reviews_due, reviews_update, user_progress
)
router = DefaultRouter()
router.register(r'words', WordViewSet)

urlpatterns = [
    path('api/', include(router.urls)),
    path('admin/', admin.site.urls),
    # path('math/', include(router.urls)),
    path('api/add-words/', add_words_bulk),
    path('words/low_mastery/', low_mastery_words),
    path("words/<int:pk>/update_quiz_stats/", update_quiz_stats),
    # --- New spaced repetition/user endpoints ---
    path('api/userwordprogress/', UserWordProgressListCreateView.as_view(), name='userwordprogress-list'),
    path('api/userwordprogress/<int:pk>/', UserWordProgressDetailView.as_view(), name='userwordprogress-detail'),
    path('api/reviewsessions/', ReviewSessionListCreateView.as_view(), name='reviewsession-list'),
    path('api/reviews/due/', reviews_due, name='reviews-due'),
    path('api/reviews/update/', reviews_update, name='reviews-update'),
    path('api/user/progress/', user_progress, name='user-progress'),
]

