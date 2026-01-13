# backend/board/views.py
from rest_framework import viewsets, status
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Board, Post, PostFile
from .serializers import BoardSerializer, PostSerializer


class BoardViewSet(viewsets.ModelViewSet):
    """게시판 ViewSet"""
    queryset = Board.objects.all()
    serializer_class = BoardSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Board.objects.all()
        
        # 리스트 조회 시 최상위 게시판만 반환 (flat 파라미터가 없는 경우)
        if self.action == 'list' and not self.request.query_params.get('flat'):
            queryset = queryset.filter(parent__isnull=True)
        
        # 특정 이름의 게시판 제외 (콤마 구분)
        exclude_names = self.request.query_params.get('exclude_names')
        if exclude_names:
            names = exclude_names.split(',')
            queryset = queryset.exclude(name__in=names)

        # 특정 타입의 게시판 제외 (콤마 구분)
        exclude_types = self.request.query_params.get('exclude_board_types')
        if exclude_types:
            types = exclude_types.split(',')
            queryset = queryset.exclude(board_type__in=types)
            
        return queryset


class PostViewSet(viewsets.ModelViewSet):
    """게시글 ViewSet"""
    queryset = Post.objects.all()
    serializer_class = PostSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        queryset = super().get_queryset()
        
        # 게시판 ID로 필터링
        board_id = self.request.query_params.get('board_id')
        if board_id:
            queryset = queryset.filter(board_id=board_id)
        
        # 게시판 타입 제외 필터
        exclude_type = self.request.query_params.get('exclude_board_type')
        if exclude_type:
            queryset = queryset.exclude(board__board_type=exclude_type)

        # 작성자 ID로 필터링
        writer_id = self.request.query_params.get('writer_id')
        if writer_id:
            queryset = queryset.filter(writer_id=writer_id)
        
        # 제목 검색
        q = self.request.query_params.get('q')
        search_field = self.request.query_params.get('search_field', 'title')
        if q:
            if search_field == 'title':
                queryset = queryset.filter(title__icontains=q)
            elif search_field == 'content':
                queryset = queryset.filter(content__icontains=q)
            elif search_field == 'writer':
                queryset = queryset.filter(writer__username__icontains=q)
            
        return queryset

    def perform_create(self, serializer):
        """게시글 생성 시 작성자 자동 설정 및 파일 처리"""
        post = serializer.save(writer=self.request.user)
        
        # 첨부파일 처리
        files = self.request.FILES.getlist('files')
        for f in files:
            PostFile.objects.create(post=post, file=f)
            
    def perform_update(self, serializer):
        """게시글 수정 시 새 파일 추가 처리"""
        post = serializer.save()
        
        # 새 첨부파일 추가
        files = self.request.FILES.getlist('files')
        for f in files:
            PostFile.objects.create(post=post, file=f)
