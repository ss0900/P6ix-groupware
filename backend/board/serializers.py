# backend/board/serializers.py
from rest_framework import serializers
from .models import Board, Post, PostFile


class BoardSerializer(serializers.ModelSerializer):
    """게시판 Serializer - 계층 구조 지원"""
    sub_boards = serializers.SerializerMethodField()

    class Meta:
        model = Board
        fields = [
            'id', 'name', 'parent', 'description', 
            'board_type', 'created_at', 'sub_boards'
        ]

    def get_sub_boards(self, obj):
        """하위 게시판을 재귀적으로 직렬화"""
        children = obj.sub_boards.all()
        return BoardSerializer(children, many=True).data


class PostFileSerializer(serializers.ModelSerializer):
    """게시글 첨부파일 Serializer"""
    class Meta:
        model = PostFile
        fields = ['id', 'file', 'created_at']


class PostSerializer(serializers.ModelSerializer):
    """게시글 Serializer"""
    writer_name = serializers.SerializerMethodField()
    board_name = serializers.CharField(source='board.name', read_only=True)
    files = PostFileSerializer(many=True, read_only=True)

    class Meta:
        model = Post
        fields = '__all__'

    def get_writer_name(self, obj):
        """작성자 이름 반환 (성+이름 또는 username)"""
        if not obj.writer:
            return ""
        full_name = f"{obj.writer.last_name}{obj.writer.first_name}"
        return full_name if full_name.strip() else obj.writer.username
