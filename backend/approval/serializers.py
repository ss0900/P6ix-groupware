# backend/approval/serializers.py
import json

from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone
from .models import (
    DocumentTemplate,
    Document,
    ApprovalLine,
    ApprovalAction,
    Attachment,
    ApprovalLinePreset,
    ApprovalLinePresetItem,
)


class DocumentTemplateSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(source="get_category_display", read_only=True)
    
    class Meta:
        model = DocumentTemplate
        fields = [
            "id", "name", "category", "category_display",
            "content", "is_active", "created_at", "updated_at"
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class AttachmentSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Attachment
        fields = [
            "id", "file", "filename", "file_size", 
            "uploaded_by", "uploaded_by_name", "uploaded_at"
        ]
        read_only_fields = ["id", "uploaded_at"]
    
    def get_uploaded_by_name(self, obj):
        if obj.uploaded_by:
            return f"{obj.uploaded_by.last_name}{obj.uploaded_by.first_name}"
        return ""


class ApprovalLineSerializer(serializers.ModelSerializer):
    approver_name = serializers.SerializerMethodField()
    approver_position = serializers.SerializerMethodField()
    approver_department = serializers.SerializerMethodField()
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    type_display = serializers.CharField(source="get_approval_type_display", read_only=True)

    class Meta:
        model = ApprovalLine
        fields = [
            "id", "approver", "approver_name", "approver_position", "approver_department",
            "order", "approval_type", "type_display", "status", "status_display",
            "comment", "acted_at", "is_read", "read_at"
        ]
        read_only_fields = ["id", "acted_at", "read_at"]

    def get_approver_name(self, obj):
        return f"{obj.approver.last_name}{obj.approver.first_name}" if obj.approver else ""

    def get_approver_position(self, obj):
        # 사용자의 주 소속에서 직위 가져오기
        membership = obj.approver.memberships.filter(is_primary=True).first()
        if membership and membership.position:
            return membership.position.name
        return ""

    def get_approver_department(self, obj):
        # 사용자의 주 소속에서 부서 가져오기
        membership = obj.approver.memberships.filter(is_primary=True).first()
        if membership and membership.department:
            return membership.department.name
        return ""


class ApprovalLinePresetItemSerializer(serializers.ModelSerializer):
    approver_name = serializers.SerializerMethodField()
    approver_position = serializers.SerializerMethodField()
    approver_department = serializers.SerializerMethodField()
    type_display = serializers.CharField(source="get_approval_type_display", read_only=True)

    class Meta:
        model = ApprovalLinePresetItem
        fields = [
            "id",
            "approver",
            "approver_name",
            "approver_position",
            "approver_department",
            "order",
            "approval_type",
            "type_display",
        ]
        read_only_fields = ["id"]

    def get_approver_name(self, obj):
        return f"{obj.approver.last_name}{obj.approver.first_name}" if obj.approver else ""

    def get_approver_position(self, obj):
        membership = obj.approver.memberships.filter(is_primary=True).first()
        if membership and membership.position:
            return membership.position.name
        return ""

    def get_approver_department(self, obj):
        membership = obj.approver.memberships.filter(is_primary=True).first()
        if membership and membership.department:
            return membership.department.name
        return ""


class ApprovalLinePresetSerializer(serializers.ModelSerializer):
    items = ApprovalLinePresetItemSerializer(many=True, read_only=True)
    lines = serializers.ListField(child=serializers.DictField(), write_only=True, required=False)
    line_count = serializers.SerializerMethodField()

    class Meta:
        model = ApprovalLinePreset
        fields = [
            "id",
            "name",
            "line_count",
            "items",
            "lines",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "line_count", "items", "created_at", "updated_at"]

    def get_line_count(self, obj):
        return obj.items.count()

    def _normalize_lines(self, lines_data):
        normalized_lines = []
        seen_approver_ids = set()
        valid_types = {choice[0] for choice in ApprovalLine.TYPE_CHOICES}
        raw_approver_ids = []
        for line_data in lines_data:
            approver_id = line_data.get("approver")
            if approver_id is None:
                continue

            try:
                parsed_approver_id = int(approver_id)
            except (TypeError, ValueError):
                continue

            approver_key = str(parsed_approver_id)
            if approver_key in seen_approver_ids:
                continue

            approval_type = line_data.get("approval_type", "approval")
            if approval_type not in valid_types:
                approval_type = "approval"

            seen_approver_ids.add(approver_key)
            raw_approver_ids.append(parsed_approver_id)
            normalized_lines.append(
                {
                    "approver_id": parsed_approver_id,
                    "approval_type": approval_type,
                }
            )

        valid_approver_ids = set(
            get_user_model()
            .objects.filter(id__in=raw_approver_ids)
            .values_list("id", flat=True)
        )
        normalized_lines = [
            line
            for line in normalized_lines
            if line["approver_id"] in valid_approver_ids
        ]
        return normalized_lines

    def _validate_name(self, owner, name, instance=None):
        if not name:
            raise serializers.ValidationError({"name": "결재선 이름을 입력해주세요."})

        duplicate_qs = ApprovalLinePreset.objects.filter(owner=owner, name=name)
        if instance is not None:
            duplicate_qs = duplicate_qs.exclude(id=instance.id)

        if duplicate_qs.exists():
            raise serializers.ValidationError({"name": "이미 같은 이름의 결재선이 있습니다."})

        return name

    @transaction.atomic
    def create(self, validated_data):
        lines_data = validated_data.pop("lines", [])
        name = (validated_data.get("name") or "").strip()
        request = self.context.get("request")
        owner = getattr(request, "user", None)

        if owner is None or not owner.is_authenticated:
            raise serializers.ValidationError("결재선 저장 권한이 없습니다.")

        if not lines_data:
            raise serializers.ValidationError({"lines": "결재선 항목이 비어 있습니다."})

        normalized_lines = self._normalize_lines(lines_data)
        if not normalized_lines:
            raise serializers.ValidationError({"lines": "유효한 결재선 항목이 없습니다."})

        preset = ApprovalLinePreset.objects.filter(owner=owner, name=name).first()
        if preset is None:
            validated_name = self._validate_name(owner, name)
            preset = ApprovalLinePreset.objects.create(owner=owner, name=validated_name)
        else:
            preset.name = self._validate_name(owner, name, instance=preset)
            preset.updated_at = timezone.now()
            preset.save(update_fields=["name", "updated_at"])
            preset.items.all().delete()

        for idx, line in enumerate(normalized_lines):
            ApprovalLinePresetItem.objects.create(
                preset=preset,
                approver_id=line["approver_id"],
                order=idx,
                approval_type=line["approval_type"],
            )

        return preset

    @transaction.atomic
    def update(self, instance, validated_data):
        name = (validated_data.get("name", instance.name) or "").strip()
        lines_data = validated_data.get("lines", None)

        instance.name = self._validate_name(instance.owner, name, instance=instance)
        instance.updated_at = timezone.now()
        instance.save(update_fields=["name", "updated_at"])

        if lines_data is not None:
            normalized_lines = self._normalize_lines(lines_data)
            if not normalized_lines:
                raise serializers.ValidationError({"lines": "유효한 결재선 항목이 없습니다."})

            instance.items.all().delete()
            for idx, line in enumerate(normalized_lines):
                ApprovalLinePresetItem.objects.create(
                    preset=instance,
                    approver_id=line["approver_id"],
                    order=idx,
                    approval_type=line["approval_type"],
                )

        return instance


class ApprovalActionSerializer(serializers.ModelSerializer):
    actor_name = serializers.SerializerMethodField()
    actor_position = serializers.SerializerMethodField()
    action_display = serializers.CharField(source="get_action_display", read_only=True)

    class Meta:
        model = ApprovalAction
        fields = ["id", "actor", "actor_name", "actor_position", "action", "action_display", "comment", "created_at"]
        read_only_fields = ["id", "created_at"]

    def get_actor_name(self, obj):
        return f"{obj.actor.last_name}{obj.actor.first_name}" if obj.actor else ""

    def get_actor_position(self, obj):
        membership = obj.actor.memberships.filter(is_primary=True).first()
        if membership and membership.position:
            return membership.position.name
        return ""


class DocumentListSerializer(serializers.ModelSerializer):
    """문서 목록용 시리얼라이저"""
    author_name = serializers.SerializerMethodField()
    author_position = serializers.SerializerMethodField()
    template_name = serializers.CharField(source="template.name", read_only=True)
    template_category = serializers.CharField(source="template.category", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    current_approver_name = serializers.SerializerMethodField()
    final_approver_name = serializers.SerializerMethodField()
    approval_lines = ApprovalLineSerializer(many=True, read_only=True)
    attachment_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Document
        fields = [
            "id", "document_number", "title", "status", "status_display", 
            "template", "template_name", "template_category",
            "author", "author_name", "author_position",
            "current_approver_name", "final_approver_name",
            "attachment_count", "is_read",
            "drafted_at", "submitted_at", "completed_at",
            "approval_lines"
        ]

    def get_author_name(self, obj):
        return f"{obj.author.last_name}{obj.author.first_name}" if obj.author else ""

    def get_author_position(self, obj):
        membership = obj.author.memberships.filter(is_primary=True).first()
        if membership and membership.position:
            return membership.position.name
        return ""

    def get_current_approver_name(self, obj):
        approver = obj.current_approver
        if approver:
            return f"{approver.last_name}{approver.first_name}"
        return ""

    def get_final_approver_name(self, obj):
        approver = obj.final_approver
        if approver:
            return f"{approver.last_name}{approver.first_name}"
        return ""


class DocumentDetailSerializer(serializers.ModelSerializer):
    """문서 상세용 시리얼라이저"""
    author_name = serializers.SerializerMethodField()
    author_position = serializers.SerializerMethodField()
    author_department = serializers.SerializerMethodField()
    template_name = serializers.CharField(source="template.name", read_only=True)
    template_category = serializers.CharField(source="template.category", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    preservation_display = serializers.CharField(source="get_preservation_period_display", read_only=True)
    approval_lines = ApprovalLineSerializer(many=True, read_only=True)
    actions = ApprovalActionSerializer(many=True, read_only=True)
    attachments = AttachmentSerializer(many=True, read_only=True)
    current_approver_name = serializers.SerializerMethodField()
    final_approver_name = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = [
            "id", "document_number", "title", "content", "form_data",
            "status", "status_display",
            "preservation_period", "preservation_display",
            "template", "template_name", "template_category",
            "author", "author_name", "author_position", "author_department",
            "current_approver_name", "final_approver_name",
            "is_read",
            "drafted_at", "submitted_at", "completed_at",
            "approval_lines", "actions", "attachments",
            "created_at", "updated_at"
        ]

    def get_author_name(self, obj):
        return f"{obj.author.last_name}{obj.author.first_name}" if obj.author else ""

    def get_author_position(self, obj):
        membership = obj.author.memberships.filter(is_primary=True).first()
        if membership and membership.position:
            return membership.position.name
        return ""

    def get_author_department(self, obj):
        membership = obj.author.memberships.filter(is_primary=True).first()
        if membership and membership.department:
            return membership.department.name
        return ""

    def get_current_approver_name(self, obj):
        approver = obj.current_approver
        if approver:
            return f"{approver.last_name}{approver.first_name}"
        return ""

    def get_final_approver_name(self, obj):
        approver = obj.final_approver
        if approver:
            return f"{approver.last_name}{approver.first_name}"
        return ""


class DocumentCreateSerializer(serializers.ModelSerializer):
    """문서 생성용 시리얼라이저"""
    approval_lines = serializers.ListField(
        child=serializers.DictField(), write_only=True, required=False
    )
    attachments = serializers.ListField(
        child=serializers.FileField(), write_only=True, required=False
    )
    submit = serializers.BooleanField(write_only=True, required=False, default=False)

    class Meta:
        model = Document
        fields = [
            "id", "title", "content", "form_data",
            "preservation_period", "template", "approval_lines", "attachments", "submit"
        ]

    def to_internal_value(self, data):
        normalized = data

        # multipart/form-data에서는 approval_lines가 문자열(JSON)로 들어오므로
        # 리스트로 역직렬화해서 ListField 검증을 통과시키도록 보정한다.
        if hasattr(data, "lists"):
            normalized = {}
            for key, values in data.lists():
                if not values:
                    normalized[key] = None
                elif len(values) == 1:
                    normalized[key] = values[0]
                else:
                    normalized[key] = values
        elif isinstance(data, dict):
            normalized = dict(data)

        raw_approval_lines = (
            normalized.get("approval_lines")
            if isinstance(normalized, dict)
            else None
        )
        if isinstance(raw_approval_lines, str):
            raw_text = raw_approval_lines.strip()
            if raw_text:
                try:
                    parsed = json.loads(raw_text)
                except json.JSONDecodeError as exc:
                    raise serializers.ValidationError(
                        {"approval_lines": "결재선 데이터 형식이 올바르지 않습니다."}
                    ) from exc
            else:
                parsed = []

            if not isinstance(parsed, list):
                raise serializers.ValidationError(
                    {"approval_lines": "결재선 데이터 형식이 올바르지 않습니다."}
                )
            normalized["approval_lines"] = parsed

        return super().to_internal_value(normalized)

    def create(self, validated_data):
        should_submit = validated_data.pop("submit", False)
        approval_lines_data = validated_data.pop("approval_lines", [])
        attachments_data = validated_data.pop("attachments", [])

        if should_submit:
            validated_data["status"] = "pending"
            validated_data["submitted_at"] = timezone.now()

        document = Document.objects.create(**validated_data)

        # 결재선 생성
        for idx, line_data in enumerate(approval_lines_data):
            ApprovalLine.objects.create(
                document=document,
                approver_id=line_data.get("approver"),
                order=idx,
                approval_type=line_data.get("approval_type", "approval"),
                status="pending" if should_submit and idx == 0 else "waiting"
            )

        if should_submit:
            user = self.context.get("request").user if self.context.get("request") else None
            if user and approval_lines_data:
                ApprovalAction.objects.create(
                    document=document,
                    actor=user,
                    action="submit",
                )

        # 첨부파일 저장
        user = self.context.get("request").user if self.context.get("request") else None
        for file in attachments_data:
            Attachment.objects.create(
                document=document,
                file=file,
                filename=file.name,
                file_size=file.size,
                uploaded_by=user
            )

        return document

    @transaction.atomic
    def update(self, instance, validated_data):
        request = self.context.get("request")
        user = request.user if request else None
        if user and instance.author_id != user.id:
            raise serializers.ValidationError(
                {"detail": "문서 작성자만 수정할 수 있습니다."}
            )

        should_submit = validated_data.pop("submit", False)
        approval_lines_data = validated_data.pop("approval_lines", None)
        attachments_data = validated_data.pop("attachments", [])

        for field in ["title", "content", "form_data", "preservation_period", "template"]:
            if field in validated_data:
                setattr(instance, field, validated_data[field])

        if approval_lines_data is not None:
            instance.approval_lines.all().delete()
            for idx, line_data in enumerate(approval_lines_data):
                ApprovalLine.objects.create(
                    document=instance,
                    approver_id=line_data.get("approver"),
                    order=idx,
                    approval_type=line_data.get("approval_type", "approval"),
                    status="pending" if should_submit and idx == 0 else "waiting",
                )
        elif should_submit:
            lines = list(instance.approval_lines.order_by("order"))
            for line in lines:
                line.status = "waiting"
                line.acted_at = None
                line.comment = ""
                line.save(update_fields=["status", "acted_at", "comment"])
            if lines:
                first_line = lines[0]
                first_line.status = "pending"
                first_line.save(update_fields=["status"])

        if should_submit:
            instance.status = "pending"
            instance.submitted_at = timezone.now()
            instance.completed_at = None

            if user:
                ApprovalAction.objects.create(
                    document=instance,
                    actor=user,
                    action="submit",
                )

        instance.save()

        for file in attachments_data:
            Attachment.objects.create(
                document=instance,
                file=file,
                filename=file.name,
                file_size=file.size,
                uploaded_by=user,
            )

        return instance

    def validate(self, attrs):
        should_submit = attrs.get("submit")
        if not should_submit:
            return attrs

        approval_lines = attrs.get("approval_lines", None)
        if approval_lines is not None and not approval_lines:
            raise serializers.ValidationError(
                {"approval_lines": "제출하려면 결재선을 설정해주세요."}
            )

        if approval_lines is None:
            instance = getattr(self, "instance", None)
            if instance is None or not instance.approval_lines.exists():
                raise serializers.ValidationError(
                    {"approval_lines": "제출하려면 결재선을 설정해주세요."}
                )

        return attrs


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


class BulkDecisionSerializer(serializers.Serializer):
    """일괄 결재 결정용 시리얼라이저"""
    document_ids = serializers.ListField(child=serializers.IntegerField())
    action = serializers.ChoiceField(choices=["approve", "reject"])
    comment = serializers.CharField(required=False, allow_blank=True, default="")
