# backend/chat/views.py
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone

from .models import Conversation, Message, Notification, HelpQuestion
from .serializers import (
    ConversationSerializer, MessageSerializer,
    NotificationSerializer, HelpQuestionSerializer
)


class ConversationViewSet(viewsets.ModelViewSet):
    """대화방 ViewSet"""
    serializer_class = ConversationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Conversation.objects.filter(participants=self.request.user)

    @action(detail=False, methods=['post'], url_path='get-or-create')
    def get_or_create_1on1(self, request):
        """1:1 대화방 가져오기 또는 생성"""
        other_user_id = request.data.get('user_id')
        if not other_user_id:
            return Response({"error": "user_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        # 기존 1:1 대화방 찾기
        conversation = Conversation.objects.filter(
            is_group=False,
            participants=request.user
        ).filter(participants=other_user_id).first()

        if not conversation:
            conversation = Conversation.objects.create(is_group=False)
            conversation.participants.add(request.user, other_user_id)

        serializer = self.get_serializer(conversation)
        return Response(serializer.data)


class MessageViewSet(viewsets.ModelViewSet):
    """메시지 ViewSet"""
    serializer_class = MessageSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        conversation_id = self.request.query_params.get('conversation')
        if not conversation_id:
            return Message.objects.none()
        
        # 권한 확인
        if not Conversation.objects.filter(id=conversation_id, participants=self.request.user).exists():
            return Message.objects.none()

        return Message.objects.filter(conversation_id=conversation_id)

    def perform_create(self, serializer):
        serializer.save(sender=self.request.user)

    @action(detail=False, methods=['post'], url_path='mark-read')
    def mark_read(self, request):
        """메시지 읽음 처리"""
        conversation_id = request.data.get('conversation_id')
        if not conversation_id:
            return Response({"error": "conversation_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        Message.objects.filter(
            conversation_id=conversation_id,
            is_read=False
        ).exclude(sender=request.user).update(is_read=True)

        return Response({"status": "ok"})


class NotificationViewSet(viewsets.ModelViewSet):
    """알림 ViewSet"""
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)

    @action(detail=False, methods=['post'], url_path='mark-all-read')
    def mark_all_read(self, request):
        """모든 알림 읽음 처리"""
        self.get_queryset().filter(is_read=False).update(is_read=True)
        return Response({"status": "ok"})

    @action(detail=True, methods=['post'], url_path='mark-read')
    def mark_read(self, request, pk=None):
        """특정 알림 읽음 처리"""
        notification = self.get_object()
        notification.is_read = True
        notification.save(update_fields=['is_read'])
        return Response({"status": "ok"})

    @action(detail=False, methods=['get'], url_path='unread-count')
    def unread_count(self, request):
        """읽지 않은 알림 수"""
        count = self.get_queryset().filter(is_read=False).count()
        return Response({"count": count})

    @action(detail=False, methods=['get'], url_path='unread_count')
    def unread_count_legacy(self, request):
        return self.unread_count(request)


class HelpQuestionViewSet(viewsets.ModelViewSet):
    """도움말 질문 ViewSet"""
    serializer_class = HelpQuestionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = HelpQuestion.objects.all()
        
        # 상태 필터
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        
        # 내 질문만
        mine = self.request.query_params.get('mine')
        if mine == 'true':
            qs = qs.filter(author=self.request.user)
        
        return qs

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    @action(detail=True, methods=['post'])
    def answer(self, request, pk=None):
        """질문에 답변 (관리자)"""
        question = self.get_object()
        answer_text = request.data.get('answer')
        if not answer_text:
            return Response({"error": "answer is required"}, status=status.HTTP_400_BAD_REQUEST)

        question.answer = answer_text
        question.status = 'answered'
        question.answered_at = timezone.now()
        question.save()

        serializer = self.get_serializer(question)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """도움말 통계"""
        qs = HelpQuestion.objects.all()
        return Response({
            "total": qs.count(),
            "answered": qs.filter(status='answered').count(),
            "pending": qs.filter(status='pending').count(),
        })
