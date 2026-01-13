# backend/approval/views.py
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from django.db.models import Q, Count
from django.http import FileResponse
from django.shortcuts import get_object_or_404

from .models import DocumentTemplate, Document, ApprovalLine, ApprovalAction, Attachment
from .serializers import (
    DocumentTemplateSerializer,
    DocumentListSerializer, DocumentDetailSerializer, 
    DocumentCreateSerializer, DocumentSubmitSerializer,
    ApprovalDecisionSerializer, ApprovalActionSerializer,
    AttachmentSerializer, BulkDecisionSerializer
)


class DocumentTemplateViewSet(viewsets.ModelViewSet):
    """결재 양식 ViewSet"""
    queryset = DocumentTemplate.objects.filter(is_active=True)
    serializer_class = DocumentTemplateSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        category = self.request.query_params.get("category")
        if category:
            qs = qs.filter(category=category)
        return qs


class DocumentViewSet(viewsets.ModelViewSet):
    """결재 문서 ViewSet"""
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        user = self.request.user
        filter_type = self.request.query_params.get("filter", "all")
        status_filter = self.request.query_params.get("status")
        is_read = self.request.query_params.get("is_read")
        search = self.request.query_params.get("search")
        template = self.request.query_params.get("template")

        qs = Document.objects.select_related("author", "template").prefetch_related(
            "approval_lines", "approval_lines__approver", "attachments"
        )

        # 필터 타입별 조회
        if filter_type == "draft":
            # 내가 작성한 임시저장
            qs = qs.filter(author=user, status="draft")
        
        elif filter_type == "sent" or filter_type == "pending_sent":
            # 내가 기안한 문서 (진행 중)
            qs = qs.filter(author=user, status="pending")
        
        elif filter_type == "my_pending":
            # 내가 결재할 문서 (내 차례)
            qs = qs.filter(
                approval_lines__approver=user,
                approval_lines__status="pending"
            )
        
        elif filter_type == "my_completed":
            # 내가 결재한 문서
            qs = qs.filter(
                approval_lines__approver=user,
                approval_lines__status__in=["approved", "rejected"]
            )
        
        elif filter_type == "in_progress":
            # 진행 중인 문서 (내가 관련된)
            qs = qs.filter(
                Q(author=user) | Q(approval_lines__approver=user),
                status="pending"
            )
        
        elif filter_type == "completed":
            # 완료된 문서 (내가 관련된)
            qs = qs.filter(
                Q(author=user) | Q(approval_lines__approver=user),
                status__in=["approved", "rejected"]
            )
        
        elif filter_type == "approved":
            # 승인된 문서
            qs = qs.filter(
                Q(author=user) | Q(approval_lines__approver=user),
                status="approved"
            )
        
        elif filter_type == "rejected":
            # 반려된 문서
            qs = qs.filter(
                Q(author=user) | Q(approval_lines__approver=user),
                status="rejected"
            )
        
        elif filter_type == "reference":
            # 참조 문서
            qs = qs.filter(
                approval_lines__approver=user,
                approval_lines__approval_type="reference"
            )
        
        elif filter_type == "all_view":
            # 전체보기 (내가 관련된 모든 문서)
            qs = qs.filter(
                Q(author=user) | Q(approval_lines__approver=user)
            ).exclude(status="draft")
        
        elif filter_type == "public":
            # 내 공문 (내가 관련된 공문 양식 문서)
            qs = qs.filter(
                Q(author=user) | Q(approval_lines__approver=user),
                template__category="official"
            ).exclude(status="draft")
        
        else:
            # 기본: 내가 관련된 문서
            qs = qs.filter(
                Q(author=user) | Q(approval_lines__approver=user)
            )

        # 추가 필터
        if status_filter:
            qs = qs.filter(status=status_filter)
        
        if is_read is not None:
            if is_read.lower() == "true":
                qs = qs.filter(is_read=True)
            elif is_read.lower() == "false":
                qs = qs.filter(is_read=False)
        
        if search:
            qs = qs.filter(
                Q(title__icontains=search) |
                Q(document_number__icontains=search) |
                Q(author__first_name__icontains=search) |
                Q(author__last_name__icontains=search)
            )
        
        if template:
            qs = qs.filter(template_id=template)

        return qs.distinct().order_by("-created_at")

    def get_serializer_class(self):
        if self.action == "list":
            return DocumentListSerializer
        elif self.action == "create":
            return DocumentCreateSerializer
        return DocumentDetailSerializer

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        
        # 열람 시 읽음 처리
        user = request.user
        approval_line = instance.approval_lines.filter(approver=user).first()
        if approval_line and not approval_line.is_read:
            from django.utils import timezone
            approval_line.is_read = True
            approval_line.read_at = timezone.now()
            approval_line.save()
        
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def submit(self, request, pk=None):
        """문서 제출 (기안)"""
        document = self.get_object()
        
        if document.author != request.user:
            return Response(
                {"error": "문서 작성자만 제출할 수 있습니다."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if document.status != "draft":
            return Response(
                {"error": "임시저장 상태의 문서만 제출할 수 있습니다."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 결재선이 있는지 확인
        if not document.approval_lines.exists():
            return Response(
                {"error": "결재선을 먼저 설정해주세요."},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = DocumentSubmitSerializer(
            document, data={}, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response({"message": "문서가 제출되었습니다."})

    @action(detail=True, methods=["post"])
    def decide(self, request, pk=None):
        """결재 결정 (승인/반려)"""
        document = self.get_object()

        serializer = ApprovalDecisionSerializer(
            document, data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        action_text = "승인" if request.data.get("action") == "approve" else "반려"
        return Response({"message": f"문서가 {action_text}되었습니다."})

    @action(detail=False, methods=["post"])
    def bulk_decide(self, request):
        """일괄 결재 결정 (승인/반려)"""
        serializer = BulkDecisionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        document_ids = serializer.validated_data["document_ids"]
        action = serializer.validated_data["action"]
        comment = serializer.validated_data.get("comment", "")
        
        success_count = 0
        errors = []
        
        for doc_id in document_ids:
            try:
                document = Document.objects.get(id=doc_id)
                decision_serializer = ApprovalDecisionSerializer(
                    document, 
                    data={"action": action, "comment": comment},
                    context={"request": request}
                )
                decision_serializer.is_valid(raise_exception=True)
                decision_serializer.save()
                success_count += 1
            except Document.DoesNotExist:
                errors.append(f"문서 ID {doc_id}를 찾을 수 없습니다.")
            except Exception as e:
                errors.append(f"문서 ID {doc_id}: {str(e)}")
        
        return Response({
            "message": f"{success_count}건이 처리되었습니다.",
            "success_count": success_count,
            "errors": errors
        })

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        """문서 취소 (회수)"""
        document = self.get_object()

        if document.author != request.user:
            return Response(
                {"error": "문서 작성자만 취소할 수 있습니다."},
                status=status.HTTP_403_FORBIDDEN
            )

        if document.status not in ["draft", "pending"]:
            return Response(
                {"error": "임시저장 또는 결재 중 상태의 문서만 취소할 수 있습니다."},
                status=status.HTTP_400_BAD_REQUEST
            )

        document.status = "canceled"
        document.save()

        ApprovalAction.objects.create(
            document=document,
            actor=request.user,
            action="cancel",
            comment=request.data.get("comment", "")
        )

        return Response({"message": "문서가 취소되었습니다."})

    @action(detail=False, methods=["get"])
    def stats(self, request):
        """결재 통계"""
        user = request.user

        # 내가 결재할 문서 (내 차례)
        my_pending_count = Document.objects.filter(
            approval_lines__approver=user,
            approval_lines__status="pending"
        ).distinct().count()

        # 내가 결재한 문서 수
        my_completed_count = Document.objects.filter(
            approval_lines__approver=user,
            approval_lines__status__in=["approved", "rejected"]
        ).distinct().count()

        # 임시저장 수
        draft_count = Document.objects.filter(
            author=user, status="draft"
        ).count()

        # 내가 기안한 문서 (진행 중)
        sent_pending_count = Document.objects.filter(
            author=user, status="pending"
        ).count()

        # 진행 중인 문서 (내가 관련된)
        in_progress_count = Document.objects.filter(
            Q(author=user) | Q(approval_lines__approver=user),
            status="pending"
        ).distinct().count()

        # 완료된 문서 (내가 관련된)
        completed_count = Document.objects.filter(
            Q(author=user) | Q(approval_lines__approver=user),
            status__in=["approved", "rejected"]
        ).distinct().count()

        # 승인된 문서
        approved_count = Document.objects.filter(
            Q(author=user) | Q(approval_lines__approver=user),
            status="approved"
        ).distinct().count()

        # 반려된 문서
        rejected_count = Document.objects.filter(
            Q(author=user) | Q(approval_lines__approver=user),
            status="rejected"
        ).distinct().count()

        # 참조 문서
        reference_count = Document.objects.filter(
            approval_lines__approver=user,
            approval_lines__approval_type="reference"
        ).distinct().count()

        # 전체 문서 (내가 관련된, 임시저장 제외)
        all_count = Document.objects.filter(
            Q(author=user) | Q(approval_lines__approver=user)
        ).exclude(status="draft").distinct().count()

        return Response({
            "my_pending": my_pending_count,
            "my_completed": my_completed_count,
            "draft": draft_count,
            "sent_pending": sent_pending_count,
            "in_progress": in_progress_count,
            "completed": completed_count,
            "approved": approved_count,
            "rejected": rejected_count,
            "reference": reference_count,
            "all": all_count,
        })

    @action(detail=True, methods=["post"])
    def upload_attachment(self, request, pk=None):
        """첨부파일 업로드"""
        document = self.get_object()
        
        if document.author != request.user:
            return Response(
                {"error": "문서 작성자만 첨부파일을 추가할 수 있습니다."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        files = request.FILES.getlist("files")
        if not files:
            return Response(
                {"error": "업로드할 파일이 없습니다."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        attachments = []
        for file in files:
            attachment = Attachment.objects.create(
                document=document,
                file=file,
                filename=file.name,
                file_size=file.size,
                uploaded_by=request.user
            )
            attachments.append(AttachmentSerializer(attachment).data)
        
        return Response({
            "message": f"{len(attachments)}개 파일이 업로드되었습니다.",
            "attachments": attachments
        })

    @action(detail=True, methods=["delete"], url_path="attachment/(?P<attachment_id>[^/.]+)")
    def delete_attachment(self, request, pk=None, attachment_id=None):
        """첨부파일 삭제"""
        document = self.get_object()
        
        if document.author != request.user:
            return Response(
                {"error": "문서 작성자만 첨부파일을 삭제할 수 있습니다."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        attachment = get_object_or_404(Attachment, id=attachment_id, document=document)
        attachment.file.delete()
        attachment.delete()
        
        return Response({"message": "첨부파일이 삭제되었습니다."})


class AttachmentViewSet(viewsets.ReadOnlyModelViewSet):
    """첨부파일 ViewSet"""
    queryset = Attachment.objects.all()
    serializer_class = AttachmentSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=True, methods=["get"])
    def download(self, request, pk=None):
        """첨부파일 다운로드"""
        attachment = self.get_object()
        response = FileResponse(
            attachment.file.open('rb'),
            as_attachment=True,
            filename=attachment.filename
        )
        return response
