# backend/approval/serializers.py
from rest_framework import serializers
from django.utils import timezone
from .models import DocumentTemplate, Document, ApprovalLine, ApprovalAction


class DocumentTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentTemplate
        fields = [
            "id", "name", "description", "category", 
            "content_template", "is_active", "created_at", "updated_at"
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class ApprovalLineSerializer(serializers.ModelSerializer):
    approver_name = serializers.SerializerMethodField()
    approver_position = serializers.SerializerMethodField()

    class Meta:
        model = ApprovalLine
        fields = [
            "id", "approver", "approver_name", "approver_position",
            "order", "approval_type", "status", "comment", "acted_at"
        ]
        read_only_fields = ["id", "acted_at"]

    def get_approver_name(self, obj):
        return f"{obj.approver.last_name}{obj.approver.first_name}" if obj.approver else ""

    def get_approver_position(self, obj):
        # 사용자의 주 소속에서 직위 가져오기
        membership = obj.approver.memberships.filter(is_primary=True).first()
        if membership and membership.position:
            return membership.position.name
        return ""


class ApprovalActionSerializer(serializers.ModelSerializer):
    actor_name = serializers.SerializerMethodField()

    class Meta:
        model = ApprovalAction
        fields = ["id", "actor", "actor_name", "action", "comment", "created_at"]
        read_only_fields = ["id", "created_at"]

    def get_actor_name(self, obj):
        return f"{obj.actor.last_name}{obj.actor.first_name}" if obj.actor else ""


class DocumentListSerializer(serializers.ModelSerializer):
    """문서 목록용 시리얼라이저"""
    author_name = serializers.SerializerMethodField()
    template_name = serializers.CharField(source="template.name", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    priority_display = serializers.CharField(source="get_priority_display", read_only=True)
    current_approver_name = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = [
            "id", "title", "status", "status_display", 
            "priority", "priority_display",
            "template", "template_name",
            "author", "author_name", "current_approver_name",
            "drafted_at", "submitted_at", "completed_at"
        ]

    def get_author_name(self, obj):
        return f"{obj.author.last_name}{obj.author.first_name}" if obj.author else ""

    def get_current_approver_name(self, obj):
        approver = obj.current_approver
        if approver:
            return f"{approver.last_name}{approver.first_name}"
        return ""


class DocumentDetailSerializer(serializers.ModelSerializer):
    """문서 상세용 시리얼라이저"""
    author_name = serializers.SerializerMethodField()
    template_name = serializers.CharField(source="template.name", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    priority_display = serializers.CharField(source="get_priority_display", read_only=True)
    approval_lines = ApprovalLineSerializer(many=True, read_only=True)
    actions = ApprovalActionSerializer(many=True, read_only=True)

    class Meta:
        model = Document
        fields = [
            "id", "title", "content", "status", "status_display",
            "priority", "priority_display",
            "template", "template_name",
            "author", "author_name",
            "attachment_count",
            "drafted_at", "submitted_at", "completed_at",
            "approval_lines", "actions",
            "created_at", "updated_at"
        ]

    def get_author_name(self, obj):
        return f"{obj.author.last_name}{obj.author.first_name}" if obj.author else ""


class DocumentCreateSerializer(serializers.ModelSerializer):
    """문서 생성용 시리얼라이저"""
    approval_lines = serializers.ListField(
        child=serializers.DictField(), write_only=True, required=False
    )

    class Meta:
        model = Document
        fields = [
            "id", "title", "content", "priority", "template", "approval_lines"
        ]

    def create(self, validated_data):
        approval_lines_data = validated_data.pop("approval_lines", [])
        document = Document.objects.create(**validated_data)

        # 결재선 생성
        for idx, line_data in enumerate(approval_lines_data):
            ApprovalLine.objects.create(
                document=document,
                approver_id=line_data.get("approver"),
                order=idx,
                approval_type=line_data.get("approval_type", "approval"),
                status="waiting" if idx > 0 else "pending"
            )

        return document


class DocumentSubmitSerializer(serializers.Serializer):
    """문서 제출용 시리얼라이저"""
    def update(self, instance, validated_data):
        instance.status = "pending"
        instance.submitted_at = timezone.now()
        instance.save()

        # 첫 번째 결재자를 pending으로 변경
        first_line = instance.approval_lines.order_by("order").first()
        if first_line:
            first_line.status = "pending"
            first_line.save()

        # 제출 이력 추가
        ApprovalAction.objects.create(
            document=instance,
            actor=self.context["request"].user,
            action="submit"
        )

        return instance


class ApprovalDecisionSerializer(serializers.Serializer):
    """결재 결정용 시리얼라이저"""
    action = serializers.ChoiceField(choices=["approve", "reject"])
    comment = serializers.CharField(required=False, allow_blank=True)

    def update(self, instance, validated_data):
        action = validated_data["action"]
        comment = validated_data.get("comment", "")
        user = self.context["request"].user

        # 현재 사용자의 결재선 찾기
        approval_line = instance.approval_lines.filter(
            approver=user, status="pending"
        ).first()

        if not approval_line:
            raise serializers.ValidationError("결재 권한이 없거나 이미 처리되었습니다.")

        approval_line.status = "approved" if action == "approve" else "rejected"
        approval_line.comment = comment
        approval_line.acted_at = timezone.now()
        approval_line.save()

        # 이력 추가
        ApprovalAction.objects.create(
            document=instance,
            actor=user,
            action=action,
            comment=comment
        )

        # 다음 결재자 활성화 또는 문서 완료 처리
        if action == "approve":
            next_line = instance.approval_lines.filter(
                status="waiting"
            ).order_by("order").first()

            if next_line:
                next_line.status = "pending"
                next_line.save()
            else:
                # 모든 결재 완료
                instance.status = "approved"
                instance.completed_at = timezone.now()
                instance.save()
        else:
            # 반려
            instance.status = "rejected"
            instance.completed_at = timezone.now()
            instance.save()

        return instance
