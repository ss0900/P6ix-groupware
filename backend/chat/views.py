from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db.models import Q
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.models import CustomUser
from project.models import ProjectMember
from resources.models import Resource

from .models import Conversation, HelpQuestion, Message, Notification
from .serializers import (
    ConversationSerializer,
    HelpQuestionSerializer,
    MessageSerializer,
    NotificationSerializer,
    UserSimpleSerializer,
)


class ConversationViewSet(viewsets.ModelViewSet):
    serializer_class = ConversationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        project_id = self.request.query_params.get("project")
        qs = Conversation.objects.filter(participants=self.request.user)
        if project_id:
            qs = qs.filter(project_id=project_id)
        return qs

    def perform_create(self, serializer):
        project_id = self.request.data.get("project")
        serializer.save(project_id=project_id or None)

    @action(detail=False, methods=["post"], url_path="get-or-create")
    def get_or_create_1on1(self, request):
        other_user_id = request.data.get("user_id")
        project_id = request.data.get("project_id")

        if not other_user_id:
            return Response({"error": "user_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        conversation = (
            Conversation.objects.filter(
                project_id=project_id or None,
                is_group=False,
                participants=request.user,
            )
            .filter(participants=other_user_id)
            .first()
        )

        if not conversation:
            conversation = Conversation.objects.create(project_id=project_id or None, is_group=False)
            conversation.participants.add(request.user, other_user_id)

        serializer = self.get_serializer(conversation)
        return Response(serializer.data)


class MessageViewSet(viewsets.ModelViewSet):
    serializer_class = MessageSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        conversation_id = self.request.query_params.get("conversation")
        if not conversation_id:
            return Message.objects.none()

        if not Conversation.objects.filter(id=conversation_id, participants=self.request.user).exists():
            return Message.objects.none()

        return Message.objects.filter(conversation_id=conversation_id).order_by("created_at")

    def perform_create(self, serializer):
        serializer.save(sender=self.request.user)

    @action(detail=False, methods=["post"], url_path="mark-read")
    def mark_read(self, request):
        conversation_id = request.data.get("conversation_id")
        if not conversation_id:
            return Response({"error": "conversation_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        Message.objects.filter(conversation_id=conversation_id, is_read=False).exclude(
            sender=request.user
        ).update(is_read=True)

        try:
            conversation = Conversation.objects.get(id=conversation_id)
            participants = conversation.participants.values_list("id", flat=True)
            channel_layer = get_channel_layer()

            for user_id in participants:
                async_to_sync(channel_layer.group_send)(
                    f"user_{user_id}",
                    {
                        "type": "messages_read",
                        "conversation_id": conversation_id,
                        "reader_id": request.user.id,
                    },
                )
        except Conversation.DoesNotExist:
            pass

        return Response({"status": "ok"})

    @action(detail=False, methods=["post"], url_path="translate")
    def translate(self, request):
        text = request.data.get("text", "")
        target_lang = request.data.get("target_lang", "")
        if not text:
            return Response({"error": "text is required"}, status=status.HTTP_400_BAD_REQUEST)

        # Translation provider is not wired in this project yet.
        # Return passthrough response so frontend UX remains consistent.
        return Response(
            {
                "translated_text": text,
                "detected_source": "auto",
                "target_lang": target_lang,
            }
        )


class DocListView(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        qs = (
            Resource.objects.filter(is_deleted=False)
            .select_related("uploader")
            .order_by("-created_at")[:300]
        )

        data = []
        for resource in qs:
            uploader_name = (
                f"{resource.uploader.last_name or ''}{resource.uploader.first_name or ''}".strip()
                or resource.uploader.username
            )
            file_url = request.build_absolute_uri(resource.file.url) if resource.file else None
            data.append(
                {
                    "id": resource.id,
                    "name": resource.name,
                    "title": resource.name,
                    "file_url": file_url,
                    "resource_type": resource.resource_type,
                    "size": resource.file_size,
                    "created_by_name": uploader_name,
                    "created_at": resource.created_at,
                }
            )
        return Response(data)


class ProjectChatUserListView(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        project_id = request.query_params.get("project")
        base_qs = CustomUser.objects.filter(is_active=True)

        if project_id:
            project_user_ids = ProjectMember.objects.filter(
                project_id=project_id,
                is_active=True,
            ).values_list("user_id", flat=True)
            base_qs = base_qs.filter(Q(id__in=project_user_ids) | Q(is_superuser=True))

        users = base_qs.distinct().order_by("-is_superuser", "username")
        serializer = UserSimpleSerializer(users, many=True)
        return Response(serializer.data)


class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)

    @action(detail=False, methods=["post"], url_path="mark-all-read")
    def mark_all_read(self, request):
        self.get_queryset().filter(is_read=False).update(is_read=True)
        return Response({"status": "ok"})

    @action(detail=True, methods=["post"], url_path="mark-read")
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.save(update_fields=["is_read"])
        return Response({"status": "ok"})

    @action(detail=False, methods=["get"], url_path="unread-count")
    def unread_count(self, request):
        count = self.get_queryset().filter(is_read=False).count()
        return Response({"count": count})

    @action(detail=False, methods=["get"], url_path="unread_count")
    def unread_count_legacy(self, request):
        return self.unread_count(request)


class HelpQuestionViewSet(viewsets.ModelViewSet):
    serializer_class = HelpQuestionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = HelpQuestion.objects.all()

        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)

        mine = self.request.query_params.get("mine")
        if mine == "true":
            qs = qs.filter(author=self.request.user)

        return qs

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    @action(detail=True, methods=["post"])
    def answer(self, request, pk=None):
        question = self.get_object()
        answer_text = request.data.get("answer")
        if not answer_text:
            return Response({"error": "answer is required"}, status=status.HTTP_400_BAD_REQUEST)

        question.answer = answer_text
        question.status = "answered"
        question.answered_at = timezone.now()
        question.save()

        serializer = self.get_serializer(question)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def stats(self, request):
        qs = HelpQuestion.objects.all()
        return Response(
            {
                "total": qs.count(),
                "answered": qs.filter(status="answered").count(),
                "pending": qs.filter(status="pending").count(),
            }
        )
