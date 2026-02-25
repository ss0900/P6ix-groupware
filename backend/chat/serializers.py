# backend/chat/serializers.py
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Conversation, Message, Notification, HelpQuestion, HelpAnswer

User = get_user_model()


class UserSimpleSerializer(serializers.ModelSerializer):
    """간단 사용자 정보"""
    name = serializers.SerializerMethodField()
    company = serializers.SerializerMethodField()
    department = serializers.SerializerMethodField()
    position = serializers.SerializerMethodField()
    profile_picture = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'first_name',
            'last_name',
            'name',
            'company',
            'department',
            'position',
            'profile_picture',
        ]

    def get_name(self, obj):
        return f"{obj.last_name or ''}{obj.first_name or ''}".strip() or obj.username

    def get_company(self, obj):
        membership = obj.memberships.filter(is_primary=True).first() or obj.memberships.first()
        return membership.company.name if membership and membership.company else None

    def get_department(self, obj):
        membership = obj.memberships.filter(is_primary=True).first() or obj.memberships.first()
        return membership.department.name if membership and membership.department else None

    def get_position(self, obj):
        membership = obj.memberships.filter(is_primary=True).first() or obj.memberships.first()
        return membership.position.name if membership and membership.position else None

    def get_profile_picture(self, obj):
        if obj.profile_picture:
            try:
                return obj.profile_picture.url
            except Exception:
                return str(obj.profile_picture)
        return None


class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()
    sender_profile_picture = serializers.SerializerMethodField()
    read_by_ids = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = ['id', 'conversation', 'sender', 'sender_name', 'sender_profile_picture', 'text', 'is_read', 'read_by_ids', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_sender_name(self, obj):
        return f"{obj.sender.last_name or ''}{obj.sender.first_name or ''}".strip() or obj.sender.username

    def get_sender_profile_picture(self, obj):
        if obj.sender.profile_picture:
            try:
                return obj.sender.profile_picture.url
            except Exception:
                return str(obj.sender.profile_picture)
        return None

    def get_read_by_ids(self, obj):
        prefetched = getattr(obj, "_prefetched_objects_cache", {}).get("read_receipts")
        if prefetched is not None:
            read_by_ids = [receipt.user_id for receipt in prefetched]
        else:
            read_by_ids = list(obj.read_receipts.values_list("user_id", flat=True))
        sender_id = obj.sender_id
        if sender_id and sender_id not in read_by_ids:
            read_by_ids.append(sender_id)
        return sorted(set(read_by_ids))


class ConversationSerializer(serializers.ModelSerializer):
    participants = serializers.PrimaryKeyRelatedField(many=True, queryset=User.objects.all())
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = ['id', 'company', 'participants', 'is_group', 'name', 'last_message', 'unread_count', 'updated_at']

    def get_last_message(self, obj):
        last_msg = obj.messages.last()
        if last_msg:
            return MessageSerializer(last_msg).data
        return None

    def get_unread_count(self, obj):
        user = self.context.get('request').user
        if user and user.is_authenticated:
            return (
                obj.messages.exclude(sender=user)
                .exclude(read_receipts__user=user)
                .distinct()
                .count()
            )
        return 0

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        ret['participants'] = UserSimpleSerializer(instance.participants.all(), many=True).data
        return ret


class NotificationSerializer(serializers.ModelSerializer):
    type_display = serializers.CharField(source='get_notification_type_display', read_only=True)

    class Meta:
        model = Notification
        fields = ['id', 'notification_type', 'type_display', 'title', 'message', 'link', 'is_read', 'created_at']
        read_only_fields = ['id', 'created_at']


class HelpQuestionSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()
    created_by_username = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    answers = serializers.SerializerMethodField()

    class Meta:
        model = HelpQuestion
        fields = [
            'id',
            'company',
            'title',
            'content',
            'author',
            'author_name',
            'created_by_username',
            'is_public',
            'status',
            'status_display',
            'answer',
            'created_at',
            'answered_at',
            'answers',
        ]
        read_only_fields = ['id', 'author', 'created_at', 'answered_at']

    def get_author_name(self, obj):
        return f"{obj.author.last_name or ''}{obj.author.first_name or ''}".strip() or obj.author.username

    def get_created_by_username(self, obj):
        return self.get_author_name(obj)

    def get_answers(self, obj):
        answers = obj.answers.all()
        return HelpAnswerSerializer(answers, many=True).data


class HelpAnswerSerializer(serializers.ModelSerializer):
    created_by_username = serializers.SerializerMethodField()

    class Meta:
        model = HelpAnswer
        fields = [
            'id',
            'question',
            'created_by',
            'created_by_username',
            'content',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']

    def get_created_by_username(self, obj):
        user = obj.created_by
        return f"{user.last_name or ''}{user.first_name or ''}".strip() or user.username
