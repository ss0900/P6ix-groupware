# backend/contact/serializers.py
from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.utils import timezone
from .models import Message, Recipient, Comment, Attachment

User = get_user_model()


class UserSimpleSerializer(serializers.ModelSerializer):
    """사용자 간단 정보"""
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "username", "full_name"]

    def get_full_name(self, obj):
        return f"{obj.last_name}{obj.first_name}".strip() or obj.username


class AttachmentSerializer(serializers.ModelSerializer):
    """첨부파일 시리얼라이저"""
    class Meta:
        model = Attachment
        fields = ["id", "file", "original_name", "file_size", "uploaded_at"]
        read_only_fields = ["id", "uploaded_at"]


class CommentSerializer(serializers.ModelSerializer):
    """댓글 시리얼라이저"""
    author = UserSimpleSerializer(read_only=True)
    author_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), source="author", write_only=True
    )

    class Meta:
        model = Comment
        fields = ["id", "author", "author_id", "content", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class RecipientSerializer(serializers.ModelSerializer):
    """수신자 시리얼라이저"""
    recipient = UserSimpleSerializer(read_only=True)
    recipient_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), source="recipient", write_only=True
    )

    class Meta:
        model = Recipient
        fields = ["id", "recipient", "recipient_id", "is_read", "read_at", "is_starred", "is_deleted"]
        read_only_fields = ["id", "is_read", "read_at"]


class MessageListSerializer(serializers.ModelSerializer):
    """메시지 목록용 시리얼라이저"""
    sender = UserSimpleSerializer(read_only=True)
    recipient_names = serializers.SerializerMethodField()
    read_count = serializers.IntegerField(read_only=True)
    total_recipients = serializers.IntegerField(read_only=True)
    read_status = serializers.CharField(read_only=True)
    has_attachments = serializers.SerializerMethodField()
    comment_count = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = [
            "id", "title", "sender", "recipient_names", "is_draft", "is_to_self",
            "is_starred", "is_deleted", "created_at", "updated_at",
            "read_count", "total_recipients", "read_status",
            "has_attachments", "comment_count"
        ]

    def get_recipient_names(self, obj):
        names = []
        for relation in obj.recipients.select_related("recipient").all():
            user = relation.recipient
            names.append(f"{user.last_name}{user.first_name}".strip() or user.username)
        return ", ".join(names)

    def get_has_attachments(self, obj):
        return obj.attachments.exists()

    def get_comment_count(self, obj):
        return obj.comments.count()


class MessageDetailSerializer(serializers.ModelSerializer):
    """메시지 상세용 시리얼라이저"""
    sender = UserSimpleSerializer(read_only=True)
    recipients = RecipientSerializer(many=True, read_only=True)
    comments = CommentSerializer(many=True, read_only=True)
    attachments = AttachmentSerializer(many=True, read_only=True)
    read_count = serializers.IntegerField(read_only=True)
    total_recipients = serializers.IntegerField(read_only=True)

    class Meta:
        model = Message
        fields = [
            "id", "title", "content", "sender", "is_draft", "is_to_self",
            "is_starred", "is_deleted", "created_at", "updated_at",
            "recipients", "comments", "attachments",
            "read_count", "total_recipients"
        ]


class MessageCreateSerializer(serializers.ModelSerializer):
    """메시지 생성용 시리얼라이저"""
    recipient_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        default=[]
    )
    attachments = serializers.ListField(
        child=serializers.FileField(),
        write_only=True,
        required=False,
        default=[]
    )

    class Meta:
        model = Message
        fields = [
            "id", "title", "content", "is_draft", "is_to_self",
            "recipient_ids", "attachments", "created_at"
        ]
        read_only_fields = ["id", "created_at"]

    def create(self, validated_data):
        recipient_ids = validated_data.pop("recipient_ids", [])
        attachment_files = validated_data.pop("attachments", [])
        
        # 메시지 생성
        message = Message.objects.create(**validated_data)
        
        # 내게 쓴 글인 경우 발신자를 수신자로 추가
        if message.is_to_self:
            Recipient.objects.create(
                message=message,
                recipient=message.sender,
                is_read=True,
                read_at=timezone.now()
            )
        else:
            # 수신자 생성
            for recipient_id in recipient_ids:
                try:
                    user = User.objects.get(id=recipient_id)
                    Recipient.objects.create(message=message, recipient=user)
                except User.DoesNotExist:
                    pass
        
        # 첨부파일 생성
        for f in attachment_files:
            Attachment.objects.create(
                message=message,
                file=f,
                original_name=f.name,
                file_size=f.size
            )
        
        return message

    def update(self, instance, validated_data):
        recipient_ids = validated_data.pop("recipient_ids", None)
        attachment_files = validated_data.pop("attachments", [])
        
        # 기본 필드 업데이트
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # 수신자 업데이트 (제공된 경우)
        if recipient_ids is not None and not instance.is_to_self:
            instance.recipients.all().delete()
            for recipient_id in recipient_ids:
                try:
                    user = User.objects.get(id=recipient_id)
                    Recipient.objects.create(message=instance, recipient=user)
                except User.DoesNotExist:
                    pass
        
        # 새 첨부파일 추가
        for f in attachment_files:
            Attachment.objects.create(
                message=instance,
                file=f,
                original_name=f.name,
                file_size=f.size
            )
        
        return instance
