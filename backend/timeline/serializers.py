# backend/timeline/serializers.py
from rest_framework import serializers
from .models import TimelineEvent, TimelineFavorite


class TimelineEventSerializer(serializers.ModelSerializer):
    """타임라인 이벤트 시리얼라이저"""
    author_name = serializers.SerializerMethodField()
    author_position = serializers.SerializerMethodField()
    author_profile_picture = serializers.SerializerMethodField()
    activity_type_display = serializers.CharField(
        source="get_activity_type_display", read_only=True
    )
    is_favorited = serializers.SerializerMethodField()
    
    class Meta:
        model = TimelineEvent
        fields = [
            "id", "author", "author_name", "author_position", "author_profile_picture",
            "activity_type", "activity_type_display",
            "title", "content",
            "reference_model", "reference_id",
            "is_active", "is_favorited",
            "created_at", "updated_at"
        ]
        read_only_fields = ["id", "author", "created_at", "updated_at"]

    def get_author_name(self, obj):
        if obj.author:
            return f"{obj.author.last_name}{obj.author.first_name}"
        return ""

    def get_author_position(self, obj):
        # 사용자의 주 소속에서 직위 가져오기
        if obj.author:
            membership = obj.author.memberships.filter(is_primary=True).first()
            if membership and membership.position:
                return membership.position.name
        return ""

    def get_author_profile_picture(self, obj):
        if obj.author and obj.author.profile_picture:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.author.profile_picture.url)
            return obj.author.profile_picture.url
        return None

    def get_is_favorited(self, obj):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            return obj.favorites.filter(user=request.user).exists()
        return False


class TimelineEventCreateSerializer(serializers.ModelSerializer):
    """타임라인 이벤트 생성용 시리얼라이저"""
    
    class Meta:
        model = TimelineEvent
        fields = [
            "activity_type", "title", "content",
            "reference_model", "reference_id"
        ]


class TimelineFavoriteSerializer(serializers.ModelSerializer):
    """즐겨찾기 시리얼라이저"""
    event_detail = TimelineEventSerializer(source="event", read_only=True)
    
    class Meta:
        model = TimelineFavorite
        fields = ["id", "user", "event", "event_detail", "created_at"]
        read_only_fields = ["id", "user", "created_at"]
