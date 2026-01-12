# backend/board/views.py
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404

from .models import Board, Post, Comment, Attachment
from .serializers import (
    BoardSerializer,
    PostListSerializer, PostDetailSerializer, PostCreateSerializer,
    CommentSerializer, AttachmentSerializer
)


class BoardViewSet(viewsets.ModelViewSet):
    """게시판 ViewSet"""
    queryset = Board.objects.filter(is_active=True)
    serializer_class = BoardSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = "slug"


class PostViewSet(viewsets.ModelViewSet):
    """게시글 ViewSet"""
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Post.objects.select_related("board", "author")
        
        # 게시판 필터
        board_slug = self.request.query_params.get("board")
        if board_slug:
            qs = qs.filter(board__slug=board_slug)
        
        # 검색
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(title__icontains=search)
        
        return qs

    def get_serializer_class(self):
        if self.action == "list":
            return PostListSerializer
        elif self.action in ["create", "update", "partial_update"]:
            return PostCreateSerializer
        return PostDetailSerializer

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        # 조회수 증가
        instance.view_count += 1
        instance.save(update_fields=["view_count"])
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def add_comment(self, request, pk=None):
        """댓글 추가"""
        post = self.get_object()
        content = request.data.get("content")
        parent_id = request.data.get("parent")

        if not content:
            return Response(
                {"error": "내용을 입력해주세요."},
                status=status.HTTP_400_BAD_REQUEST
            )

        comment = Comment.objects.create(
            post=post,
            author=request.user,
            content=content,
            parent_id=parent_id if parent_id else None
        )

        return Response(CommentSerializer(comment).data, status=status.HTTP_201_CREATED)


class CommentViewSet(viewsets.ModelViewSet):
    """댓글 ViewSet"""
    queryset = Comment.objects.select_related("author", "post")
    serializer_class = CommentSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    def destroy(self, request, *args, **kwargs):
        comment = self.get_object()
        if comment.author != request.user and not request.user.is_staff:
            return Response(
                {"error": "삭제 권한이 없습니다."},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().destroy(request, *args, **kwargs)
