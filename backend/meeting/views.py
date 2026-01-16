# backend/meeting/views.py
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db import transaction
from django.db.models import Q
from datetime import timedelta

from .models import (
    MeetingRoom, Meeting, MeetingParticipant,
    Calendar, Schedule, ScheduleAttendee,
    Resource, ResourceReservation
)
from .serializers import (
    MeetingRoomSerializer,
    MeetingListSerializer, MeetingDetailSerializer, MeetingCreateSerializer,
    MeetingParticipantSerializer,
    CalendarSerializer,
    ScheduleListSerializer, ScheduleDetailSerializer, ScheduleCreateSerializer,
    ScheduleAttendeeSerializer,
    ResourceSerializer, ResourceReservationSerializer
)


class MeetingRoomViewSet(viewsets.ModelViewSet):
    """회의실 ViewSet"""
    queryset = MeetingRoom.objects.all()
    serializer_class = MeetingRoomSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()

        is_active = self.request.query_params.get("is_active")
        if str(is_active).lower() in ("1", "true", "yes"):
            qs = qs.filter(is_active=True)

        return qs.order_by("order", "name")

    @action(detail=False, methods=["post"], url_path="reorder")
    def reorder(self, request):
        """회의실 정렬 순서를 일괄 저장"""
        ordered_ids = request.data.get("ordered_ids") or []

        if not isinstance(ordered_ids, list):
            return Response(
                {"detail": "ordered_ids must be a list."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            ordered_ids = [int(x) for x in ordered_ids]
        except (TypeError, ValueError):
            return Response(
                {"detail": "ordered_ids must be a list of integers."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        qs = MeetingRoom.objects.filter(id__in=ordered_ids)
        rooms_by_id = {r.id: r for r in qs}

        with transaction.atomic():
            for idx, rid in enumerate(ordered_ids, start=1):
                room = rooms_by_id.get(rid)
                if room and room.order != idx:
                    room.order = idx
                    room.save(update_fields=["order"])

        return Response({"count": len(rooms_by_id)}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["get"])
    def availability(self, request, pk=None):
        """회의실 가용 시간 조회"""
        room = self.get_object()
        date_str = request.query_params.get("date")

        if date_str:
            from datetime import datetime
            try:
                check_date = datetime.strptime(date_str, "%Y-%m-%d").date()
            except ValueError:
                return Response({"error": "날짜 형식이 올바르지 않습니다."}, status=400)
        else:
            check_date = timezone.now().date()

        # 해당 날짜의 회의 목록
        meetings = Meeting.objects.filter(
            meeting_room=room,
            schedule__date=check_date
        ).values("schedule", "title")

        return Response({
            "date": check_date,
            "room": MeetingRoomSerializer(room).data,
            "bookings": list(meetings)
        })


class MeetingViewSet(viewsets.ModelViewSet):
    """회의 ViewSet"""
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = Meeting.objects.select_related(
            "author", "meeting_room"
        ).prefetch_related("participants__user")

        # 내가 만든 회의 또는 내가 참석자인 회의만 조회
        qs = qs.filter(
            Q(author=user) | Q(participants__user=user)
        ).distinct()

        # 날짜 필터
        date = self.request.query_params.get("date")
        if date:
            qs = qs.filter(schedule__date=date)

        start = self.request.query_params.get("start")
        end = self.request.query_params.get("end")
        if start and end:
            qs = qs.filter(schedule__date__range=[start, end])

        return qs.order_by("schedule")

    def get_serializer_class(self):
        if self.action == "list":
            return MeetingListSerializer
        elif self.action in ["create", "update", "partial_update"]:
            return MeetingCreateSerializer
        return MeetingDetailSerializer

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    @action(detail=False, methods=["get"])
    def me(self, request):
        """본인 정보 반환"""
        u = request.user
        return Response({
            "id": u.id,
            "first_name": getattr(u, "first_name", ""),
            "last_name": getattr(u, "last_name", ""),
            "position": getattr(u, "position", ""),
        })

    @action(detail=True, methods=["post"])
    def rsvp(self, request, pk=None):
        """참석 여부 응답"""
        meeting = self.get_object()
        participant = MeetingParticipant.objects.filter(
            meeting=meeting, user=request.user
        ).first()

        if not participant:
            return Response(
                {"detail": "참석 대상이 아닙니다."},
                status=status.HTTP_403_FORBIDDEN
            )

        is_attending = request.data.get("is_attending")
        participant.is_attending = is_attending in ["true", "True", True, 1, "1", "yes"]
        participant.responded = True
        participant.responded_at = timezone.now()
        participant.save()

        return Response(MeetingParticipantSerializer(participant).data)

    @action(detail=True, methods=["post"], url_path="reset_rsvp")
    def reset_rsvp(self, request, pk=None):
        """RSVP 상태 초기화"""
        meeting = self.get_object()
        participant = MeetingParticipant.objects.filter(
            meeting=meeting, user=request.user
        ).first()

        if not participant:
            return Response(
                {"detail": "참석 대상이 아닙니다."},
                status=status.HTTP_403_FORBIDDEN
            )

        participant.responded = False
        participant.is_attending = False
        participant.responded_at = None
        participant.save()

        return Response(MeetingParticipantSerializer(participant).data)

    @action(detail=True, methods=["get"])
    def participants(self, request, pk=None):
        """참석자 목록"""
        meeting = self.get_object()
        participants = meeting.participants.all()
        serializer = MeetingParticipantSerializer(participants, many=True)
        return Response(serializer.data)


class ScheduleViewSet(viewsets.ModelViewSet):
    """일정 ViewSet"""
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = Schedule.objects.select_related(
            "owner", "company", "calendar"
        ).prefetch_related("participants")

        # 기본: 내가 만든 일정 + 내가 참여자인 일정 + 회사 일정
        base_q = Q(owner=user) | Q(participants=user) | Q(scope=Schedule.SCOPE_COMPANY)
        qs = qs.filter(base_q).distinct()

        # scope 필터
        scope = self.request.query_params.get("scope")
        if scope in [Schedule.SCOPE_PERSONAL, Schedule.SCOPE_COMPANY]:
            qs = qs.filter(scope=scope)

        # company 필터
        company = self.request.query_params.get("company")
        if company:
            qs = qs.filter(company_id=company)

        # calendar 필터
        calendar_id = self.request.query_params.get("calendar")
        if calendar_id:
            qs = qs.filter(calendar_id=calendar_id)

        # calendar_ids 다중 필터 (체크박스 UI)
        calendar_ids = self.request.query_params.get("calendar_ids")
        if calendar_ids:
            ids = [int(x) for x in calendar_ids.split(",") if x.isdigit()]
            if ids:
                qs = qs.filter(calendar_id__in=ids)

        # event_type 필터
        event_type = self.request.query_params.get("event_type")
        if event_type:
            qs = qs.filter(event_type=event_type)

        # 날짜 필터
        start = self.request.query_params.get("start")
        end = self.request.query_params.get("end")
        if start and end:
            qs = qs.filter(start__date__range=[start, end])

        date_from = self.request.query_params.get("date_from")
        date_to = self.request.query_params.get("date_to")
        if date_from and date_to:
            qs = qs.filter(start__date__gte=date_from, start__date__lte=date_to)

        # 월별 필터
        year = self.request.query_params.get("year")
        month = self.request.query_params.get("month")
        if year and month:
            qs = qs.filter(start__year=year, start__month=month)

        # 검색
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(
                Q(title__icontains=search) |
                Q(memo__icontains=search) |
                Q(location__icontains=search)
            )

        return qs.order_by("start")

    def get_serializer_class(self):
        if self.action == "list":
            return ScheduleListSerializer
        elif self.action in ["create", "update", "partial_update"]:
            return ScheduleCreateSerializer
        return ScheduleDetailSerializer

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

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
    def personal(self, request):
        """개인 일정"""
        qs = self.get_queryset().filter(
            scope=Schedule.SCOPE_PERSONAL,
            owner=request.user
        )
        return Response(ScheduleListSerializer(qs, many=True).data)

    @action(detail=False, methods=["get"])
    def company(self, request):
        """회사 일정"""
        company_id = request.query_params.get("company")
        qs = self.get_queryset().filter(scope=Schedule.SCOPE_COMPANY)
        if company_id:
            qs = qs.filter(company_id=company_id)
        return Response(ScheduleListSerializer(qs, many=True).data)

    @action(detail=False, methods=["get"])
    def today(self, request):
        """오늘 일정"""
        today = timezone.now().date()
        qs = self.get_queryset().filter(start__date=today)
        return Response(ScheduleListSerializer(qs, many=True).data)

    @action(detail=False, methods=["get"])
    def upcoming(self, request):
        """다가오는 일정 (7일)"""
        now = timezone.now()
        week_later = now + timedelta(days=7)
        qs = self.get_queryset().filter(
            start__gte=now,
            start__lte=week_later
        )[:10]
        return Response(ScheduleListSerializer(qs, many=True).data)

    @action(detail=False, methods=["get"])
    def this_week(self, request):
        """금주 일정"""
        today = timezone.now().date()
        start_of_week = today - timedelta(days=today.weekday())
        end_of_week = start_of_week + timedelta(days=6)
        qs = self.get_queryset().filter(
            start__date__gte=start_of_week,
            start__date__lte=end_of_week
        )
        return Response(ScheduleListSerializer(qs, many=True).data)


class CalendarViewSet(viewsets.ModelViewSet):
    """캘린더 ViewSet"""
    serializer_class = CalendarSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        # 내 캘린더 + 공유 캘린더 + 회사 캘린더
        qs = Calendar.objects.filter(
            Q(owner=user) |
            Q(category__in=["all", "shared"]) |
            Q(company=user.company) if hasattr(user, 'company') else Q(owner=user)
        ).distinct()

        # category 필터
        category = self.request.query_params.get("category")
        if category:
            qs = qs.filter(category=category)

        # is_active 필터
        is_active = self.request.query_params.get("is_active")
        if str(is_active).lower() in ("1", "true", "yes"):
            qs = qs.filter(is_active=True)

        return qs.order_by("order", "name")

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    @action(detail=False, methods=["get"])
    def my_calendars(self, request):
        """내 캘린더 목록 (사이드바용)"""
        qs = self.get_queryset().filter(is_active=True)
        serializer = CalendarSerializer(qs, many=True)
        return Response(serializer.data)


class ResourceViewSet(viewsets.ModelViewSet):
    """자원 ViewSet"""
    queryset = Resource.objects.all()
    serializer_class = ResourceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()

        # resource_type 필터
        resource_type = self.request.query_params.get("resource_type")
        if resource_type:
            qs = qs.filter(resource_type=resource_type)

        # is_active 필터
        is_active = self.request.query_params.get("is_active")
        if str(is_active).lower() in ("1", "true", "yes"):
            qs = qs.filter(is_active=True)

        return qs.order_by("order", "name")

    @action(detail=True, methods=["get"])
    def availability(self, request, pk=None):
        """자원 가용성 조회"""
        resource = self.get_object()
        date_str = request.query_params.get("date")
        start_str = request.query_params.get("start")
        end_str = request.query_params.get("end")

        reservations = ResourceReservation.objects.filter(
            resource=resource,
            status__in=["pending", "approved"]
        )

        if date_str:
            from datetime import datetime
            try:
                check_date = datetime.strptime(date_str, "%Y-%m-%d").date()
                reservations = reservations.filter(start__date=check_date)
            except ValueError:
                return Response({"error": "날짜 형식이 올바르지 않습니다."}, status=400)

        if start_str and end_str:
            reservations = reservations.filter(
                end__gt=start_str,
                start__lt=end_str
            )

        return Response({
            "resource": ResourceSerializer(resource).data,
            "reservations": ResourceReservationSerializer(reservations, many=True).data
        })

    @action(detail=False, methods=["get"])
    def available(self, request):
        """특정 시간에 사용 가능한 자원 찾기"""
        start_str = request.query_params.get("start")
        end_str = request.query_params.get("end")
        resource_type = request.query_params.get("resource_type")

        if not start_str or not end_str:
            return Response({"error": "start와 end 파라미터가 필요합니다."}, status=400)

        # 해당 시간에 예약된 자원 ID
        reserved_ids = ResourceReservation.objects.filter(
            end__gt=start_str,
            start__lt=end_str,
            status__in=["pending", "approved"]
        ).values_list("resource_id", flat=True)

        qs = Resource.objects.filter(is_active=True).exclude(id__in=reserved_ids)
        if resource_type:
            qs = qs.filter(resource_type=resource_type)

        return Response(ResourceSerializer(qs, many=True).data)


class ResourceReservationViewSet(viewsets.ModelViewSet):
    """자원 예약 ViewSet"""
    serializer_class = ResourceReservationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = ResourceReservation.objects.select_related(
            "resource", "reserved_by", "approved_by"
        )

        # 기본: 내가 예약한 것 + 승인 대기 목록(관리자용)
        qs = qs.filter(reserved_by=user)

        # resource 필터
        resource = self.request.query_params.get("resource")
        if resource:
            qs = qs.filter(resource_id=resource)

        # status 필터
        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)

        # 날짜 필터
        date_str = self.request.query_params.get("date")
        if date_str:
            qs = qs.filter(start__date=date_str)

        return qs.order_by("-start")

    def perform_create(self, serializer):
        resource = serializer.validated_data.get("resource")
        # 승인 불필요 자원은 바로 승인
        if resource and not resource.requires_approval:
            serializer.save(
                reserved_by=self.request.user,
                status="approved"
            )
        else:
            serializer.save(reserved_by=self.request.user)

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        """예약 승인"""
        reservation = self.get_object()
        reservation.status = "approved"
        reservation.approved_by = request.user
        reservation.approved_at = timezone.now()
        reservation.save()
        return Response(ResourceReservationSerializer(reservation).data)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        """예약 반려"""
        reservation = self.get_object()
        reservation.status = "rejected"
        reservation.approved_by = request.user
        reservation.approved_at = timezone.now()
        reservation.note = request.data.get("reason", "")
        reservation.save()
        return Response(ResourceReservationSerializer(reservation).data)

