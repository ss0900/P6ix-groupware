# backend/contact/views.py
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.db.models import Q, Count
from django.utils import timezone

from .models import Message, Recipient, Comment, Attachment
from .serializers import (
    MessageListSerializer, MessageDetailSerializer, MessageCreateSerializer,
    CommentSerializer, AttachmentSerializer
)


class MessageViewSet(viewsets.ModelViewSet):
    """업무연락 메시지 ViewSet"""
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        user = self.request.user
        # Detail/action requests should be resolvable regardless of list folder filters.
        if self.action != "list":
            queryset = Message.objects.filter(
                Q(sender=user) | Q(recipients__recipient=user)
            )
            if self.action in ["update", "partial_update", "destroy"]:
                queryset = queryset.filter(sender=user)
            return queryset.annotate(
                _read_count=Count("recipients", filter=Q(recipients__is_read=True)),
                _total_recipients=Count("recipients")
            ).distinct().order_by("-updated_at")

        folder = self.request.query_params.get("folder", "all")
        search = self.request.query_params.get("search", "")
        starred = self.request.query_params.get("starred", "")

        # 기본 쿼리: 사용자가 발신자이거나 수신자인 메시지
        if folder == "sent":
            # 송신함: 내가 보낸 메시지 (임시저장, 내게 쓴 글 제외)
            queryset = Message.objects.filter(
                sender=user, is_draft=False, is_to_self=False, is_deleted=False
            )
        elif folder == "received":
            # 수신함: 내가 받은 메시지
            queryset = Message.objects.filter(
                recipients__recipient=user,
                recipients__is_deleted=False,
                is_draft=False,
                is_to_self=False
            )
        elif folder == "draft":
            # 임시보관함: 내 임시저장 메시지
            queryset = Message.objects.filter(
                sender=user, is_draft=True, is_deleted=False
            )
        elif folder == "self":
            # 내게 쓴 글
            queryset = Message.objects.filter(
                sender=user, is_to_self=True, is_deleted=False
            )
        elif folder == "trash":
            # 휴지통: 삭제된 메시지 (발신 또는 수신)
            sent_deleted = Message.objects.filter(sender=user, is_deleted=True)
            received_deleted = Message.objects.filter(
                recipients__recipient=user, recipients__is_deleted=True
            )
            queryset = (sent_deleted | received_deleted).distinct()
        else:
            # 전체함: 내가 보낸 메시지 + 내가 받은 메시지 (삭제되지 않은 것)
            sent = Message.objects.filter(sender=user, is_deleted=False, is_draft=False)
            received = Message.objects.filter(
                recipients__recipient=user,
                recipients__is_deleted=False,
                is_draft=False
            )
            queryset = (sent | received).distinct()

        # 검색 필터
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) |
                Q(sender__first_name__icontains=search) |
                Q(sender__last_name__icontains=search) |
                Q(sender__username__icontains=search)
            )

        # 중요 표시 필터
        if starred == "true":
            queryset = queryset.filter(is_starred=True)

        # 읽음 상태 주석
        queryset = queryset.annotate(
            _read_count=Count("recipients", filter=Q(recipients__is_read=True)),
            _total_recipients=Count("recipients")
        )

        return queryset.distinct().order_by("-updated_at")

    def get_serializer_class(self):
        if self.action == "list":
            return MessageListSerializer
        elif self.action in ["create", "update", "partial_update"]:
            return MessageCreateSerializer
        return MessageDetailSerializer

    def perform_create(self, serializer):
        serializer.save(sender=self.request.user)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        user = request.user

        # 수신자인 경우 읽음 처리
        recipient = instance.recipients.filter(recipient=user).first()
        if recipient and not recipient.is_read:
            recipient.is_read = True
            recipient.read_at = timezone.now()
            recipient.save()

        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def mark_read(self, request, pk=None):
        """읽음 표시"""
        message = self.get_object()
        recipient = message.recipients.filter(recipient=request.user).first()
        if recipient:
            recipient.is_read = True
            recipient.read_at = timezone.now()
            recipient.save()
            return Response({"status": "marked as read"})
        return Response({"error": "not a recipient"}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"])
    def mark_unread(self, request, pk=None):
        """안읽음 표시"""
        message = self.get_object()
        recipient = message.recipients.filter(recipient=request.user).first()
        if recipient:
            recipient.is_read = False
            recipient.read_at = None
            recipient.save()
            return Response({"status": "marked as unread"})
        return Response({"error": "not a recipient"}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"])
    def toggle_star(self, request, pk=None):
        """별표 토글"""
        message = self.get_object()
        user = request.user

        # 발신자인 경우 메시지의 starred 토글
        if message.sender == user:
            message.is_starred = not message.is_starred
            message.save()
            return Response({"is_starred": message.is_starred})

        # 수신자인 경우 Recipient의 starred 토글
        recipient = message.recipients.filter(recipient=user).first()
        if recipient:
            recipient.is_starred = not recipient.is_starred
            recipient.save()
            return Response({"is_starred": recipient.is_starred})

        return Response({"error": "not authorized"}, status=status.HTTP_403_FORBIDDEN)

    @action(detail=True, methods=["post"])
    def move_to_trash(self, request, pk=None):
        """휴지통으로 이동"""
        message = self.get_object()
        user = request.user

        if message.sender == user:
            message.is_deleted = True
            message.save()
        
        recipient = message.recipients.filter(recipient=user).first()
        if recipient:
            recipient.is_deleted = True
            recipient.save()

        return Response({"status": "moved to trash"})

    @action(detail=True, methods=["post"])
    def restore(self, request, pk=None):
        """복원"""
        message = self.get_object()
        user = request.user

        if message.sender == user:
            message.is_deleted = False
            message.save()
        
        recipient = message.recipients.filter(recipient=user).first()
        if recipient:
            recipient.is_deleted = False
            recipient.save()

        return Response({"status": "restored"})

    @action(detail=False, methods=["get"])
    def folder_counts(self, request):
        """각 폴더별 개수 반환"""
        user = request.user

        all_count = Message.objects.filter(
            Q(sender=user, is_deleted=False, is_draft=False) |
            Q(recipients__recipient=user, recipients__is_deleted=False, is_draft=False)
        ).distinct().count()

        received_count = Message.objects.filter(
            recipients__recipient=user,
            recipients__is_deleted=False,
            is_draft=False,
            is_to_self=False
        ).count()

        # 수신함 안읽은 개수
        received_unread = Message.objects.filter(
            recipients__recipient=user,
            recipients__is_deleted=False,
            recipients__is_read=False,
            is_draft=False,
            is_to_self=False
        ).count()

        sent_count = Message.objects.filter(
            sender=user, is_draft=False, is_to_self=False, is_deleted=False
        ).count()

        draft_count = Message.objects.filter(
            sender=user, is_draft=True, is_deleted=False
        ).count()

        self_count = Message.objects.filter(
            sender=user, is_to_self=True, is_deleted=False
        ).count()

        trash_count = Message.objects.filter(
            Q(sender=user, is_deleted=True) |
            Q(recipients__recipient=user, recipients__is_deleted=True)
        ).distinct().count()

        return Response({
            "all": all_count,
            "received": received_count,
            "received_unread": received_unread,
            "sent": sent_count,
            "draft": draft_count,
            "self": self_count,
            "trash": trash_count
        })


class CommentViewSet(viewsets.ModelViewSet):
    """댓글 ViewSet"""
    serializer_class = CommentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        message_id = self.kwargs.get("message_pk")
        return Comment.objects.filter(message_id=message_id)

    def perform_create(self, serializer):
        message_id = self.kwargs.get("message_pk")
        message = Message.objects.get(id=message_id)
        serializer.save(author=self.request.user, message=message)
        # 메시지 updated_at 갱신
        message.save()
