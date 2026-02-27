# backend/meeting/views.py
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db.models import Q
from datetime import timedelta

from .models import (
    Calendar, Schedule, ScheduleAttendee,
    Resource, ResourceReservation
)
from .serializers import (
    CalendarSerializer,
    ScheduleListSerializer, ScheduleDetailSerializer, ScheduleCreateSerializer,
    ScheduleAttendeeSerializer,
    ResourceSerializer, ResourceReservationSerializer
)


class ScheduleViewSet(viewsets.ModelViewSet):
    """일정 ViewSet (회의 통합)"""
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = Schedule.objects.select_related("owner", "calendar", "resource").prefetch_related("participants")

        # 필터: scope
        scope = self.request.query_params.get("scope")
        if scope:
            qs = qs.filter(scope=scope)

        # 필터: event_type (meeting, general, annual 등)
        event_type = self.request.query_params.get("event_type")
        if event_type:
            qs = qs.filter(event_type=event_type)

        # 필터: date_from, date_to
        date_from = self.request.query_params.get("date_from")
        date_to = self.request.query_params.get("date_to")
        if date_from:
            qs = qs.filter(start__date__gte=date_from)
        if date_to:
            qs = qs.filter(start__date__lte=date_to)

        # 필터: year, month (캘린더 월간 뷰)
        year = self.request.query_params.get("year")
        month = self.request.query_params.get("month")
        if year and month:
            qs = qs.filter(start__year=year, start__month=month)

        # 필터: calendar_ids
        calendar_ids = self.request.query_params.get("calendar_ids")
        if calendar_ids:
            ids = [int(x) for x in calendar_ids.split(",") if x.isdigit()]
            if ids:
                qs = qs.filter(calendar_id__in=ids)

        # 필터: search
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(Q(title__icontains=search) | Q(memo__icontains=search))

        # 필터: is_urgent (회의 전용)
        is_urgent = self.request.query_params.get("is_urgent")
        if is_urgent and is_urgent.lower() == "true":
            qs = qs.filter(is_urgent=True)

        # 권한: 개인 일정은 본인 것만, 회사 일정 및 공유 일정은 모두
        visibility_filter = Q(scope="company") | Q(owner=user) | Q(participants=user) | Q(visibility="public")
        
        # organization 공개 일정: 같은 회사 소속인 경우에만
        if hasattr(user, 'company') and user.company:
            visibility_filter |= Q(visibility="organization", owner__company=user.company)
        else:
            visibility_filter |= Q(visibility="organization")
        
        qs = qs.filter(visibility_filter).distinct()

        return qs

    def get_serializer_class(self):
        if self.action == "list":
            return ScheduleListSerializer
        elif self.action in ["create", "update", "partial_update"]:
            return ScheduleCreateSerializer
        return ScheduleDetailSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["request"] = self.request
        return context

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    # ===== RSVP 관련 액션 (Meeting에서 통합) =====

    @action(detail=False, methods=["get"])
    def me(self, request):
        """본인 정보 반환"""
        user = request.user
        return Response({
            "id": user.id,
            "name": f"{user.last_name}{user.first_name}",
            "email": user.email,
        })

    @action(detail=True, methods=["post"])
    def rsvp(self, request, pk=None):
        """참석 여부 응답 (회의용 RSVP)"""
        schedule = self.get_object()
        is_attending = request.data.get("is_attending")

        attendee, created = ScheduleAttendee.objects.get_or_create(
            schedule=schedule,
            user=request.user,
        )
        attendee.is_attending = is_attending
        attendee.response = "accepted" if is_attending else "declined"
        attendee.responded_at = timezone.now()
        attendee.save()

        # 참여자에도 추가
        if is_attending:
            schedule.participants.add(request.user)
        
        return Response(ScheduleAttendeeSerializer(attendee).data)

    @action(detail=True, methods=["post"])
    def reset_rsvp(self, request, pk=None):
        """RSVP 상태 초기화"""
        schedule = self.get_object()
        
        attendee = ScheduleAttendee.objects.filter(
            schedule=schedule,
            user=request.user
        ).first()
        
        if attendee:
            attendee.is_attending = None
            attendee.response = "pending"
            attendee.responded_at = None
            attendee.save()
            return Response(ScheduleAttendeeSerializer(attendee).data)
        
        return Response({"detail": "참석 정보가 없습니다."}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=["get"])
    def participants(self, request, pk=None):
        """참석자 목록"""
        schedule = self.get_object()
        attendees = schedule.attendee_responses.select_related("user").all()
        return Response(ScheduleAttendeeSerializer(attendees, many=True).data)

    @action(detail=True, methods=["post"])
    def respond(self, request, pk=None):
        """참석 응답 (일반 일정용)"""
        schedule = self.get_object()
        response_value = request.data.get("response", "pending")

        attendee, created = ScheduleAttendee.objects.get_or_create(
            schedule=schedule,
            user=request.user
        )
        attendee.response = response_value
        attendee.responded_at = timezone.now()
        
        # is_attending 자동 설정
        if response_value == "accepted":
            attendee.is_attending = True
        elif response_value == "declined":
            attendee.is_attending = False
        else:
            attendee.is_attending = None
        
        attendee.save()
        return Response(ScheduleAttendeeSerializer(attendee).data)

    # ===== 편의 조회 액션 =====

    @action(detail=False, methods=["get"])
    def personal(self, request):
        """개인 일정"""
        qs = self.get_queryset().filter(scope="personal", owner=request.user)
        serializer = ScheduleListSerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def company(self, request):
        """회사 일정"""
        qs = self.get_queryset().filter(scope="company")
        serializer = ScheduleListSerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def meetings(self, request):
        """회의 일정만"""
        qs = self.get_queryset().filter(event_type="meeting")
        serializer = ScheduleListSerializer(qs, many=True, context={"request": request})
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def today(self, request):
        """오늘 일정"""
        today = timezone.now().date()
        qs = self.get_queryset().filter(start__date=today)
        serializer = ScheduleListSerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def upcoming(self, request):
        """다가오는 일정 (7일)"""
        now = timezone.now()
        end = now + timedelta(days=7)
        qs = self.get_queryset().filter(start__gte=now, start__lte=end)
        serializer = ScheduleListSerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def this_week(self, request):
        """금주 일정"""
        today = timezone.now().date()
        start_of_week = today - timedelta(days=today.weekday())
        end_of_week = start_of_week + timedelta(days=6)
        qs = self.get_queryset().filter(start__date__gte=start_of_week, start__date__lte=end_of_week)
        serializer = ScheduleListSerializer(qs, many=True)
        return Response(serializer.data)


class CalendarViewSet(viewsets.ModelViewSet):
    """캘린더 ViewSet"""
    serializer_class = CalendarSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = Calendar.objects.prefetch_related("sub_calendars")
        
        # 필터: calendar_type
        calendar_type = self.request.query_params.get("calendar_type")
        if calendar_type:
            qs = qs.filter(calendar_type=calendar_type)
        
        # 필터: category
        category = self.request.query_params.get("category")
        if category:
            qs = qs.filter(category=category)

        # 본인 소유 캘린더 또는 회사 공유 캘린더
        return qs.filter(
            Q(owner=user) |
            Q(company=user.company if hasattr(user, 'company') else None) |
            Q(is_default=True) |
            Q(calendar_type="system")
        ).distinct()

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    @action(detail=False, methods=["get"])
    def my_calendars(self, request):
        """내 캘린더 목록 (사이드바용)"""
        qs = self.get_queryset().filter(parent__isnull=True)
        serializer = CalendarSerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def custom_calendars(self, request):
        """사용자 정의 캘린더 목록 (동적 메뉴용)"""
        qs = Calendar.objects.filter(
            calendar_type="custom",
            parent__isnull=True,
            is_active=True
        ).prefetch_related("sub_calendars").order_by("order", "name")
        serializer = CalendarSerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["post"])
    def create_custom(self, request):
        """사용자 정의 캘린더 생성"""
        data = request.data.copy()
        data["calendar_type"] = "custom"
        data["owner"] = request.user.id
        
        serializer = CalendarSerializer(data=data)
        if serializer.is_valid():
            serializer.save(owner=request.user, calendar_type="custom")
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=["post"])
    def reorder(self, request):
        """캘린더 정렬 순서 일괄 저장"""
        ordered_ids = request.data.get("ordered_ids", [])
        if not ordered_ids:
            return Response({"detail": "ordered_ids is required"}, status=status.HTTP_400_BAD_REQUEST)

        for idx, calendar_id in enumerate(ordered_ids):
            Calendar.objects.filter(pk=calendar_id).update(order=idx)

        return Response({"detail": "순서가 저장되었습니다."})


class ResourceViewSet(viewsets.ModelViewSet):
    """자원 ViewSet (회의실 통합)"""
    queryset = Resource.objects.all()
    serializer_class = ResourceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Resource.objects.all()

        # 필터: resource_type
        resource_type = self.request.query_params.get("resource_type")
        if resource_type:
            qs = qs.filter(resource_type=resource_type)

        # 필터: is_active
        is_active = self.request.query_params.get("is_active")
        if is_active is not None:
            qs = qs.filter(is_active=is_active.lower() == "true")

        return qs

    @action(detail=False, methods=["get"])
    def rooms(self, request):
        """회의실 목록 (MeetingRoom 대체)"""
        qs = self.get_queryset().filter(resource_type="room")
        serializer = ResourceSerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["post"])
    def reorder(self, request):
        """자원 정렬 순서 일괄 저장"""
        ordered_ids = request.data.get("ordered_ids", [])
        if not ordered_ids:
            return Response({"detail": "ordered_ids is required"}, status=status.HTTP_400_BAD_REQUEST)

        for idx, resource_id in enumerate(ordered_ids):
            Resource.objects.filter(pk=resource_id).update(order=idx)

        return Response({"detail": "순서가 저장되었습니다."})

    @action(detail=True, methods=["get"])
    def availability(self, request, pk=None):
        """자원 가용성 조회"""
        resource = self.get_object()
        date = request.query_params.get("date")
        
        if not date:
            return Response({"detail": "date is required"}, status=status.HTTP_400_BAD_REQUEST)

        reservations = ResourceReservation.objects.filter(
            resource=resource,
            start__date=date,
            status__in=["pending", "approved"]
        ).order_by("start")

        return Response({
            "resource_id": resource.id,
            "date": date,
            "reservations": [
                {
                    "id": r.id,
                    "start": r.start.strftime("%H:%M"),
                    "end": r.end.strftime("%H:%M"),
                    "purpose": r.purpose,
                    "reserved_by": f"{r.reserved_by.last_name}{r.reserved_by.first_name}" if r.reserved_by else "",
                    "status": r.status,
                }
                for r in reservations
            ]
        })

    @action(detail=False, methods=["get"])
    def available(self, request):
        """특정 시간에 사용 가능한 자원 찾기"""
        start = request.query_params.get("start")
        end = request.query_params.get("end")
        resource_type = request.query_params.get("resource_type")

        if not start or not end:
            return Response({"detail": "start and end are required"}, status=status.HTTP_400_BAD_REQUEST)

        qs = Resource.objects.filter(is_active=True)
        if resource_type:
            qs = qs.filter(resource_type=resource_type)

        # 해당 시간에 예약이 없는 자원
        reserved_ids = ResourceReservation.objects.filter(
            end__gt=start,
            start__lt=end,
            status__in=["pending", "approved"]
        ).values_list("resource_id", flat=True)

        available = qs.exclude(id__in=reserved_ids)
        serializer = ResourceSerializer(available, many=True)
        return Response(serializer.data)


class ResourceReservationViewSet(viewsets.ModelViewSet):
    """자원 예약 ViewSet"""
    serializer_class = ResourceReservationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = ResourceReservation.objects.select_related("resource", "reserved_by", "approved_by")

        # 필터: resource
        resource_id = self.request.query_params.get("resource")
        if resource_id:
            qs = qs.filter(resource_id=resource_id)

        # 필터: resource_type
        resource_type = self.request.query_params.get("resource_type")
        if resource_type:
            qs = qs.filter(resource__resource_type=resource_type)

        # 필터: status
        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)

        # 필터: date
        date = self.request.query_params.get("date")
        if date:
            qs = qs.filter(start__date=date)

        # 필터: date_from, date_to
        date_from = self.request.query_params.get("date_from")
        date_to = self.request.query_params.get("date_to")
        if date_from:
            qs = qs.filter(start__gte=date_from)
        if date_to:
            qs = qs.filter(start__lte=date_to)

        # 필터: my (내 예약만)
        my = self.request.query_params.get("my")
        if my and my.lower() == "true":
            qs = qs.filter(reserved_by=user)

        return qs

    def perform_create(self, serializer):
        resource = serializer.validated_data.get("resource")
        # 승인 불필요 시 자동 승인
        if not resource.requires_approval:
            serializer.save(
                reserved_by=self.request.user,
                status="approved",
                approved_by=self.request.user,
                approved_at=timezone.now()
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
        reason = request.data.get("reason", "")
        reservation.status = "rejected"
        reservation.note = f"반려 사유: {reason}" if reason else reservation.note
        reservation.save()
        return Response(ResourceReservationSerializer(reservation).data)
