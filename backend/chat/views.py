from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db.models import Q
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.models import CustomUser, UserMembership
from resources.models import Resource

from .models import Conversation, HelpAnswer, HelpQuestion, Message, MessageReadReceipt, Notification
from .serializers import (
    ConversationSerializer,
    HelpAnswerSerializer,
    HelpQuestionSerializer,
    MessageSerializer,
    NotificationSerializer,
    UserSimpleSerializer,
)


def _get_allowed_company_ids(user):
    return set(UserMembership.objects.filter(user=user).values_list("company_id", flat=True))


def _get_default_company_id(user):
    primary_company = (
        UserMembership.objects.filter(user=user, is_primary=True)
        .values_list("company_id", flat=True)
        .first()
    )
    if primary_company:
        return primary_company

    first_company = (
        UserMembership.objects.filter(user=user)
        .values_list("company_id", flat=True)
        .first()
    )
    return first_company


def _resolve_company_scope(request, payload=None, required=False):
    payload = payload or {}
    raw_company = payload.get("company_id") or payload.get("company") or request.query_params.get("company")
    allowed_company_ids = _get_allowed_company_ids(request.user)

    if raw_company not in (None, "", "null"):
        try:
            company_id = int(raw_company)
        except (TypeError, ValueError):
            raise ValidationError({"company": "company 媛믪씠 ?좏슚?섏? ?딆뒿?덈떎."})

        if not request.user.is_superuser and company_id not in allowed_company_ids:
            raise PermissionDenied("?대떦 ?뚯궗 踰붿쐞???묎렐?????놁뒿?덈떎.")
        return company_id

    default_company_id = _get_default_company_id(request.user)
    if default_company_id:
        return default_company_id

    if required:
        raise ValidationError({"company": "?뚯궗 ?ㅼ퐫?꾨? ?뺤씤?????놁뒿?덈떎. ?뚯냽 ?뚯궗瑜??ㅼ젙??二쇱꽭??"})
    return None


def _is_user_in_company(user_id, company_id):
    return UserMembership.objects.filter(user_id=user_id, company_id=company_id).exists()


class ConversationViewSet(viewsets.ModelViewSet):
    serializer_class = ConversationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        company_id = _resolve_company_scope(self.request, required=False)
        if not company_id:
            return Conversation.objects.none()
        return Conversation.objects.filter(participants=self.request.user, company_id=company_id)

    def perform_create(self, serializer):
        company_id = _resolve_company_scope(self.request, payload=self.request.data, required=True)
        participants = serializer.validated_data.get("participants", [])
        participant_ids = {participant.id for participant in participants}
        participant_ids.add(self.request.user.id)

        if not self.request.user.is_superuser:
            invalid_user_ids = [
                user_id for user_id in participant_ids if not _is_user_in_company(user_id, company_id)
            ]
            if invalid_user_ids:
                raise ValidationError(
                    {"participants": "Participants must belong to the selected company scope."}
                )

        conversation = serializer.save(company_id=company_id)
        conversation.participants.add(self.request.user)

    @action(detail=False, methods=["post"], url_path="get-or-create")
    def get_or_create_1on1(self, request):
        other_user_id = request.data.get("user_id")
        company_id = _resolve_company_scope(request, payload=request.data, required=True)

        if not other_user_id:
            return Response({"error": "user_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            other_user_id = int(other_user_id)
        except (TypeError, ValueError):
            return Response({"error": "user_id must be an integer"}, status=status.HTTP_400_BAD_REQUEST)

        if not CustomUser.objects.filter(id=other_user_id, is_active=True).exists():
            return Response({"error": "user not found"}, status=status.HTTP_404_NOT_FOUND)

        if not request.user.is_superuser and not _is_user_in_company(other_user_id, company_id):
            raise PermissionDenied("1:1 conversations are only allowed within the selected company scope.")

        conversation = (
            Conversation.objects.filter(
                company_id=company_id,
                is_group=False,
                participants=request.user,
            )
            .filter(participants=other_user_id)
            .first()
        )

        if not conversation:
            conversation = Conversation.objects.create(company_id=company_id, is_group=False)
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

        return (
            Message.objects.filter(conversation_id=conversation_id)
            .select_related("sender")
            .prefetch_related("read_receipts")
            .order_by("created_at")
        )

    def perform_create(self, serializer):
        message = serializer.save(sender=self.request.user)
        MessageReadReceipt.objects.get_or_create(message=message, user=self.request.user)

    @action(detail=False, methods=["post"], url_path="mark-read")
    def mark_read(self, request):
        conversation_id = request.data.get("conversation_id")
        if not conversation_id:
            return Response({"error": "conversation_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        conversation = Conversation.objects.filter(id=conversation_id, participants=request.user).first()
        if not conversation:
            return Response({"error": "conversation not found"}, status=status.HTTP_404_NOT_FOUND)

        target_messages = Message.objects.filter(conversation_id=conversation_id).exclude(sender=request.user)
        unread_message_ids = list(
            target_messages.exclude(read_receipts__user=request.user).values_list("id", flat=True).distinct()
        )

        if unread_message_ids:
            MessageReadReceipt.objects.bulk_create(
                [
                    MessageReadReceipt(message_id=message_id, user=request.user)
                    for message_id in unread_message_ids
                ],
                ignore_conflicts=True,
            )
            Message.objects.filter(id__in=unread_message_ids, is_read=False).update(is_read=True)

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
        company_id = _resolve_company_scope(request, required=False)
        if not company_id:
            return Response([])

        qs = (
            Resource.objects.filter(
                is_deleted=False,
                uploader__memberships__company_id=company_id,
            )
            .select_related("uploader")
            .distinct()
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


class CompanyChatUserListView(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        company_id = _resolve_company_scope(request, required=False)
        if not company_id:
            return Response([])

        users = (
            CustomUser.objects.filter(is_active=True)
            .filter(Q(memberships__company_id=company_id) | Q(is_superuser=True))
            .distinct()
            .order_by("-is_superuser", "username")
        )
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
        company_id = _resolve_company_scope(self.request, payload=self.request.data, required=False)
        if not company_id:
            return HelpQuestion.objects.none()

        qs = (
            HelpQuestion.objects.filter(company_id=company_id)
            .select_related("author")
            .prefetch_related("answers__created_by")
            .order_by("-created_at")
        )

        if not self.request.user.is_superuser:
            qs = qs.filter(Q(author=self.request.user) | Q(is_public=True)).distinct()

        search_term = self.request.query_params.get("search")
        if search_term:
            qs = qs.filter(Q(title__icontains=search_term) | Q(content__icontains=search_term))

        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)

        mine = self.request.query_params.get("mine")
        if mine == "true":
            qs = qs.filter(author=self.request.user)

        return qs

    def perform_create(self, serializer):
        company_id = _resolve_company_scope(self.request, payload=self.request.data, required=True)
        serializer.save(author=self.request.user, company_id=company_id)

    def perform_update(self, serializer):
        instance = serializer.instance
        if instance.author_id != self.request.user.id and not self.request.user.is_superuser:
            raise PermissionDenied("You can only edit your own questions.")
        serializer.save()

    def perform_destroy(self, instance):
        if instance.author_id != self.request.user.id and not self.request.user.is_superuser:
            raise PermissionDenied("You can only delete your own questions.")
        instance.delete()

    @action(detail=True, methods=["post"])
    def answer(self, request, pk=None):
        if not request.user.is_superuser:
            raise PermissionDenied("Only superusers can answer questions.")

        question = self.get_object()
        answer_text = request.data.get("answer")
        if not answer_text:
            return Response({"error": "answer is required"}, status=status.HTTP_400_BAD_REQUEST)

        HelpAnswer.objects.create(
            question=question,
            content=answer_text,
            created_by=request.user,
        )
        question.answer = answer_text
        question.status = "answered"
        question.answered_at = timezone.now()
        question.save(update_fields=["answer", "status", "answered_at"])

        serializer = self.get_serializer(question)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path="unanswered_count")
    def unanswered_count(self, request):
        company_id = _resolve_company_scope(request, required=False)
        if not company_id:
            return Response({"count": 0})

        qs = HelpQuestion.objects.filter(company_id=company_id, answers__isnull=True)
        if not request.user.is_superuser:
            qs = qs.filter(Q(author=request.user) | Q(is_public=True)).distinct()
        return Response({"count": qs.count()})

    @action(detail=False, methods=["get"])
    def stats(self, request):
        qs = self.get_queryset()
        return Response(
            {
                "total": qs.count(),
                "answered": qs.filter(answers__isnull=False).distinct().count(),
                "pending": qs.filter(answers__isnull=True).count(),
            }
        )


class HelpAnswerViewSet(viewsets.ModelViewSet):
    serializer_class = HelpAnswerSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        company_id = _resolve_company_scope(self.request, payload=self.request.data, required=False)
        if not company_id:
            return HelpAnswer.objects.none()

        qs = (
            HelpAnswer.objects.filter(question__company_id=company_id)
            .select_related("question", "created_by")
            .order_by("created_at")
        )

        if self.request.user.is_superuser:
            return qs

        return qs.filter(
            Q(question__author=self.request.user) | Q(question__is_public=True)
        ).distinct()

    def perform_create(self, serializer):
        if not self.request.user.is_superuser:
            raise PermissionDenied("Only superusers can answer questions.")

        question = serializer.validated_data["question"]
        company_id = _resolve_company_scope(self.request, payload=self.request.data, required=True)

        if question.company_id != company_id:
            raise PermissionDenied("Question does not belong to the selected company scope.")

        serializer.save(created_by=self.request.user)

        question.answer = serializer.validated_data["content"]
        question.status = "answered"
        question.answered_at = timezone.now()
        question.save(update_fields=["answer", "status", "answered_at"])

    def perform_update(self, serializer):
        if not self.request.user.is_superuser:
            raise PermissionDenied("Only superusers can update answers.")
        answer = serializer.save()
        question = answer.question
        question.answer = answer.content
        question.status = "answered"
        if not question.answered_at:
            question.answered_at = timezone.now()
        question.save(update_fields=["answer", "status", "answered_at"])

    def perform_destroy(self, instance):
        if not self.request.user.is_superuser:
            raise PermissionDenied("Only superusers can delete answers.")
        question = instance.question
        instance.delete()
        latest_answer = question.answers.order_by("-created_at").first()
        if latest_answer:
            question.answer = latest_answer.content
            question.status = "answered"
        else:
            question.answer = ""
            question.status = "pending"
            question.answered_at = None
        question.save(update_fields=["answer", "status", "answered_at"])

