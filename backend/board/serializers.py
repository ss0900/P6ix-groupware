# backend/board/serializers.py
from rest_framework import serializers
from .models import Board, Post, Comment, Attachment


class BoardSerializer(serializers.ModelSerializer):
    post_count = serializers.SerializerMethodField()

    class Meta:
        model = Board
        fields = [
            "id", "name", "slug", "board_type", "description",
            "is_active", "can_write_all", "can_comment", "can_attach",
            "order", "post_count", "created_at"
        ]
        read_only_fields = ["id", "created_at", "post_count"]

    def get_post_count(self, obj):
        return obj.posts.count()


class AttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attachment
        fields = ["id", "file", "original_name", "file_size", "download_count", "uploaded_at"]
        read_only_fields = ["id", "uploaded_at", "download_count"]


class CommentSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()
    replies = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = [
            "id", "author", "author_name", "parent",
            "content", "replies", "created_at", "updated_at"
        ]
        read_only_fields = ["id", "author", "created_at", "updated_at"]

    def get_author_name(self, obj):
        return f"{obj.author.last_name}{obj.author.first_name}" if obj.author else ""

    def get_replies(self, obj):
        if obj.replies.exists():
            return CommentSerializer(obj.replies.all(), many=True).data
        return []


class PostListSerializer(serializers.ModelSerializer):
    """게시글 목록용"""
    author_name = serializers.SerializerMethodField()
    board_name = serializers.CharField(source="board.name", read_only=True)
    comment_count = serializers.SerializerMethodField()
    attachment_count = serializers.SerializerMethodField()

    class Meta:
        model = Post
        fields = [
            "id", "board", "board_name", "author", "author_name",
            "title", "is_notice", "is_secret",
            "view_count", "comment_count", "attachment_count",
            "created_at"
        ]

    def get_author_name(self, obj):
        return f"{obj.author.last_name}{obj.author.first_name}" if obj.author else ""

    def get_comment_count(self, obj):
        return obj.comments.count()

    def get_attachment_count(self, obj):
        return obj.attachments.count()


class PostDetailSerializer(serializers.ModelSerializer):
    """게시글 상세용"""
    author_name = serializers.SerializerMethodField()
    board_name = serializers.CharField(source="board.name", read_only=True)
    comments = serializers.SerializerMethodField()
    attachments = AttachmentSerializer(many=True, read_only=True)

    class Meta:
        model = Post
        fields = [
            "id", "board", "board_name", "author", "author_name",
            "title", "content", "is_notice", "is_secret",
            "view_count", "comments", "attachments",
            "created_at", "updated_at"
        ]

    def get_author_name(self, obj):
        return f"{obj.author.last_name}{obj.author.first_name}" if obj.author else ""

    def get_comments(self, obj):
        # 최상위 댓글만 (대댓글은 replies로)
        top_comments = obj.comments.filter(parent__isnull=True)
        return CommentSerializer(top_comments, many=True).data


class PostCreateSerializer(serializers.ModelSerializer):
    """게시글 생성용"""
    class Meta:
        model = Post
        fields = ["id", "board", "title", "content", "is_notice", "is_secret"]
        read_only_fields = ["id"]
