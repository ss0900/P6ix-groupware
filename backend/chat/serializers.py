# backend/chat/serializers.py
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Conversation, Message, Notification, HelpQuestion

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

    class Meta:
        model = Message
        fields = ['id', 'conversation', 'sender', 'sender_name', 'sender_profile_picture', 'text', 'is_read', 'created_at']
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


class ConversationSerializer(serializers.ModelSerializer):
    participants = serializers.PrimaryKeyRelatedField(many=True, queryset=User.objects.all())
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = ['id', 'project', 'participants', 'is_group', 'name', 'last_message', 'unread_count', 'updated_at']

    def get_last_message(self, obj):
        last_msg = obj.messages.last()
        if last_msg:
            return MessageSerializer(last_msg).data
        return None

    def get_unread_count(self, obj):
        user = self.context.get('request').user
        if user and user.is_authenticated:
            return obj.messages.filter(is_read=False).exclude(sender=user).count()
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
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = HelpQuestion
        fields = [
            'id', 'title', 'content', 'author', 'author_name', 
            'status', 'status_display', 'answer', 'created_at', 'answered_at'
        ]
        read_only_fields = ['id', 'author', 'created_at', 'answered_at']

    def get_author_name(self, obj):
        return f"{obj.author.last_name or ''}{obj.author.first_name or ''}".strip() or obj.author.username
