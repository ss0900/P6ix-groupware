# backend/timeline/views.py
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from django.utils import timezone
from datetime import timedelta

from .models import TimelineEvent, TimelineFavorite
from .serializers import (
    TimelineEventSerializer,
    TimelineEventCreateSerializer,
    TimelineFavoriteSerializer
)


class TimelineEventViewSet(viewsets.ModelViewSet):
    """타임라인 이벤트 ViewSet"""
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = TimelineEvent.objects.select_related("author").prefetch_related(
            "favorites", "author__memberships__position"
        ).filter(is_active=True)

        # 활동 유형 필터
        activity_types = self.request.query_params.get("activity_type", "")
        if activity_types:
            types_list = [t.strip() for t in activity_types.split(",") if t.strip()]
            if types_list:
                qs = qs.filter(activity_type__in=types_list)

        # 날짜 범위 필터
        start_date = self.request.query_params.get("start_date")
        end_date = self.request.query_params.get("end_date")
        if start_date:
            qs = qs.filter(created_at__date__gte=start_date)
        if end_date:
            qs = qs.filter(created_at__date__lte=end_date)

        # 검색
        search = self.request.query_params.get("search", "")
        if search:
            qs = qs.filter(
                Q(title__icontains=search) |
                Q(content__icontains=search) |
                Q(author__first_name__icontains=search) |
                Q(author__last_name__icontains=search)
            )

        # 즐겨찾기만 보기
        favorites_only = self.request.query_params.get("favorites_only", "").lower() == "true"
        if favorites_only:
            qs = qs.filter(favorites__user=user)

        # 기간 필터 (전체, 기간 적용)
        period = self.request.query_params.get("period", "")
        if period == "week":
            qs = qs.filter(created_at__gte=timezone.now() - timedelta(days=7))
        elif period == "month":
            qs = qs.filter(created_at__gte=timezone.now() - timedelta(days=30))

        return qs.distinct().order_by("-created_at")

    def get_serializer_class(self):
        if self.action == "create":
            return TimelineEventCreateSerializer
        return TimelineEventSerializer

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    @action(detail=True, methods=["post"])
    def toggle_favorite(self, request, pk=None):
        """즐겨찾기 토글"""
        event = self.get_object()
        user = request.user

        favorite, created = TimelineFavorite.objects.get_or_create(
            user=user, event=event
        )

        if not created:
            favorite.delete()
            return Response({
                "is_favorited": False,
                "message": "즐겨찾기가 해제되었습니다."
            })

        return Response({
            "is_favorited": True,
            "message": "즐겨찾기에 추가되었습니다."
        })

    @action(detail=False, methods=["get"])
    def favorites(self, request):
        """즐겨찾기 목록"""
        favorites = TimelineFavorite.objects.filter(
            user=request.user
        ).select_related("event", "event__author")
        
        serializer = TimelineFavoriteSerializer(favorites, many=True, context={"request": request})
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def activity_types(self, request):
        """활동 유형 목록 반환"""
        return Response([
            {"value": choice[0], "label": choice[1]}
            for choice in TimelineEvent.ACTIVITY_CHOICES
        ])
