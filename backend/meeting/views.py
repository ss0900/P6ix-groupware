# backend/meeting/views.py
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db.models import Q
from datetime import datetime, timedelta

from .models import MeetingRoom, Schedule, ScheduleAttendee
from .serializers import (
    MeetingRoomSerializer,
    ScheduleListSerializer, ScheduleDetailSerializer, ScheduleCreateSerializer,
    ScheduleAttendeeSerializer
)


class MeetingRoomViewSet(viewsets.ModelViewSet):
    """회의실 ViewSet"""
    queryset = MeetingRoom.objects.filter(is_active=True)
    serializer_class = MeetingRoomSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=True, methods=["get"])
    def availability(self, request, pk=None):
        """회의실 가용 시간 조회"""
        room = self.get_object()
        date_str = request.query_params.get("date")
        
        if date_str:
            try:
                check_date = datetime.strptime(date_str, "%Y-%m-%d").date()
            except ValueError:
                return Response({"error": "날짜 형식이 올바르지 않습니다."}, status=400)
        else:
            check_date = timezone.now().date()
        
        # 해당 날짜의 예약 목록
        schedules = Schedule.objects.filter(
            meeting_room=room,
            start_time__date=check_date
        ).values("start_time", "end_time", "title")
        
        return Response({
            "date": check_date,
            "room": MeetingRoomSerializer(room).data,
            "bookings": list(schedules)
        })


class ScheduleViewSet(viewsets.ModelViewSet):
    """일정 ViewSet"""
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = Schedule.objects.select_related("author", "meeting_room").prefetch_related("attendees")
        
        # 기본: 내가 만든 일정 + 내가 참석자인 일정
        qs = qs.filter(
            Q(author=user) | Q(attendees=user) | Q(schedule_type="company")
        ).distinct()
        
        # 날짜 필터
        start = self.request.query_params.get("start")
        end = self.request.query_params.get("end")
        
        if start:
            qs = qs.filter(start_time__gte=start)
        if end:
            qs = qs.filter(end_time__lte=end)
        
        # 월별 필터
        year = self.request.query_params.get("year")
        month = self.request.query_params.get("month")
        
        if year and month:
            qs = qs.filter(start_time__year=year, start_time__month=month)
        
        # 유형 필터
        schedule_type = self.request.query_params.get("type")
        if schedule_type:
            qs = qs.filter(schedule_type=schedule_type)
        
        return qs.order_by("start_time")

    def get_serializer_class(self):
        if self.action == "list":
            return ScheduleListSerializer
        elif self.action in ["create", "update", "partial_update"]:
            return ScheduleCreateSerializer
        return ScheduleDetailSerializer

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    @action(detail=True, methods=["post"])
    def respond(self, request, pk=None):
        """참석 응답"""
        schedule = self.get_object()
        response_value = request.data.get("response")
        
        if response_value not in ["accepted", "declined", "tentative"]:
            return Response(
                {"error": "올바른 응답 값이 아닙니다."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        attendee_response, _ = ScheduleAttendee.objects.get_or_create(
            schedule=schedule, user=request.user
        )
        attendee_response.response = response_value
        attendee_response.responded_at = timezone.now()
        attendee_response.save()
        
        return Response({"message": "응답이 저장되었습니다."})

    @action(detail=False, methods=["get"])
    def today(self, request):
        """오늘 일정"""
        today = timezone.now().date()
        qs = self.get_queryset().filter(
            start_time__date=today
        )
        serializer = ScheduleListSerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def upcoming(self, request):
        """다가오는 일정 (7일)"""
        now = timezone.now()
        week_later = now + timedelta(days=7)
        qs = self.get_queryset().filter(
            start_time__gte=now,
            start_time__lte=week_later
        )[:10]
        serializer = ScheduleListSerializer(qs, many=True)
        return Response(serializer.data)
