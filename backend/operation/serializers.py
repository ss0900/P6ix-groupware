# backend/operation/serializers.py
"""
영업관리(Operation) 모듈 - Serializers
"""
from rest_framework import serializers
from django.utils.dateparse import parse_datetime
from django.contrib.auth import get_user_model
from .models import (
    CustomerCompany, CustomerContact,
    SalesPipeline, SalesStage,
    SalesLead, LeadActivity, LeadTask, LeadFile,
    Quote, QuoteItem, QuoteTemplate,
    SalesContractLink, Tender, RevenueMilestone, Collection,
    EmailTemplate, EmailSignature, EmailSendLog
)

User = get_user_model()


# ============================================================
# 사용자 (간단 참조용)
# ============================================================
class SimpleUserSerializer(serializers.ModelSerializer):
    """간단한 사용자 정보"""
    full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'full_name']
    
    def get_full_name(self, obj):
        name = f"{obj.last_name}{obj.first_name}".strip()
        return name if name else obj.username


# ============================================================
# 고객 관리
# ============================================================
class CustomerContactSerializer(serializers.ModelSerializer):
    """고객 담당자 Serializer"""
    company_name = serializers.CharField(source='company.name', read_only=True)
    
    class Meta:
        model = CustomerContact
        fields = [
            'id', 'company', 'company_name', 'name', 'priority', 'position', 
            'department', 'email', 'phone', 'mobile', 
            'is_primary', 'notes', 'created_at', 'updated_at'
        ]


class CustomerCompanySerializer(serializers.ModelSerializer):
    """고객사 Serializer"""
    contacts = CustomerContactSerializer(many=True, read_only=True)
    contacts_count = serializers.SerializerMethodField()
    leads_count = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    owner_name = serializers.SerializerMethodField()
    
    class Meta:
        model = CustomerCompany
        fields = [
            'id', 'name', 'business_number', 'industry', 
            'address', 'phone', 'website', 'notes',
            'status', 'tags', 'owner', 'owner_name',
            'contacts', 'contacts_count', 'leads_count',
            'created_by', 'created_by_name', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_by']
    
    def get_contacts_count(self, obj):
        return obj.contacts.count()
    
    def get_leads_count(self, obj):
        return obj.leads.count()
    
    def get_created_by_name(self, obj):
        if obj.created_by:
            name = f"{obj.created_by.last_name}{obj.created_by.first_name}".strip()
            return name if name else obj.created_by.username
        return ""

    def get_owner_name(self, obj):
        if obj.owner:
            name = f"{obj.owner.last_name}{obj.owner.first_name}".strip()
            return name if name else obj.owner.username
        return ""


class CustomerCompanyListSerializer(serializers.ModelSerializer):
    """고객사 리스트용 Serializer (간략)"""
    contacts_count = serializers.SerializerMethodField()
    leads_count = serializers.SerializerMethodField()
    primary_contact = serializers.SerializerMethodField()
    owner_name = serializers.SerializerMethodField()
    
    class Meta:
        model = CustomerCompany
        fields = [
            'id', 'name', 'business_number', 'industry', 'phone',
            'status', 'owner', 'owner_name',
            'contacts_count', 'leads_count', 'primary_contact', 'created_at'
        ]
    
    def get_contacts_count(self, obj):
        return obj.contacts.count()
    
    def get_leads_count(self, obj):
        return obj.leads.count()
    
    def get_primary_contact(self, obj):
        contact = obj.contacts.filter(is_primary=True).first()
        if contact:
            return {'id': contact.id, 'name': contact.name, 'phone': contact.phone}
        return None

    def get_owner_name(self, obj):
        if obj.owner:
            name = f"{obj.owner.last_name}{obj.owner.first_name}".strip()
            return name if name else obj.owner.username
        return ""


# ============================================================
# 파이프라인 / 단계
# ============================================================
class SalesStageSerializer(serializers.ModelSerializer):
    """영업 단계 Serializer"""
    leads_count = serializers.SerializerMethodField()
    
    class Meta:
        model = SalesStage
        fields = [
            'id', 'pipeline', 'name', 'order', 
            'stage_type', 'probability', 'color',
            'leads_count', 'created_at'
        ]
    
    def get_leads_count(self, obj):
        return obj.leads.filter(status='active').count()


class SalesPipelineSerializer(serializers.ModelSerializer):
    """파이프라인 Serializer"""
    stages = SalesStageSerializer(many=True, read_only=True)
    leads_count = serializers.SerializerMethodField()
    total_amount = serializers.SerializerMethodField()
    
    class Meta:
        model = SalesPipeline
        fields = [
            'id', 'name', 'description', 'is_default', 'is_active',
            'stages', 'leads_count', 'total_amount',
            'created_at', 'updated_at'
        ]
    
    def get_leads_count(self, obj):
        return obj.leads.filter(status='active').count()
    
    def get_total_amount(self, obj):
        from django.db.models import Sum
        result = obj.leads.filter(status='active').aggregate(
            total=Sum('expected_amount')
        )
        return result['total'] or 0


# ============================================================
# 영업 기회 (Lead)
# ============================================================
class LeadActivitySerializer(serializers.ModelSerializer):
    """활동 로그 Serializer"""
    activity_type_display = serializers.CharField(
        source='get_activity_type_display', read_only=True
    )
    created_by_name = serializers.SerializerMethodField()
    from_stage_name = serializers.CharField(source='from_stage.name', read_only=True)
    to_stage_name = serializers.CharField(source='to_stage.name', read_only=True)
    
    class Meta:
        model = LeadActivity
        fields = [
            'id', 'lead', 'activity_type', 'activity_type_display',
            'title', 'content',
            'from_stage', 'from_stage_name', 'to_stage', 'to_stage_name',
            'activity_date',
            'created_by', 'created_by_name', 'created_at'
        ]
        read_only_fields = ['created_by']
    
    def get_created_by_name(self, obj):
        if obj.created_by:
            name = f"{obj.created_by.last_name}{obj.created_by.first_name}".strip()
            return name if name else obj.created_by.username
        return ""


class LeadTaskSerializer(serializers.ModelSerializer):
    """할 일 Serializer"""
    assignee_name = serializers.SerializerMethodField()
    priority_display = serializers.CharField(
        source='get_priority_display', read_only=True
    )
    lead_title = serializers.CharField(source='lead.title', read_only=True)
    is_overdue = serializers.SerializerMethodField()
    due_at = serializers.DateTimeField(write_only=True, required=False, allow_null=True)
    
    class Meta:
        model = LeadTask
        fields = [
            'id', 'lead', 'lead_title', 'title', 'description',
            'assignee', 'assignee_name', 'due_date', 'due_at',
            'priority', 'priority_display',
            'is_completed', 'completed_at',
            'show_on_calendar', 'reminder_at', 'is_overdue',
            'created_by', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_by', 'completed_at']

    def validate(self, attrs):
        due_at = attrs.pop("due_at", None)
        if due_at is not None and not attrs.get("due_date"):
            attrs["due_date"] = due_at
        return attrs

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["due_at"] = data.get("due_date")
        return data
    
    def get_assignee_name(self, obj):
        if obj.assignee:
            name = f"{obj.assignee.last_name}{obj.assignee.first_name}".strip()
            return name if name else obj.assignee.username
        return ""
    
    def get_is_overdue(self, obj):
        from django.utils import timezone
        if obj.due_date and not obj.is_completed:
            return obj.due_date < timezone.now()
        return False


class LeadFileSerializer(serializers.ModelSerializer):
    """첨부파일 Serializer"""
    uploaded_by_name = serializers.SerializerMethodField()
    file_url = serializers.SerializerMethodField()
    
    class Meta:
        model = LeadFile
        fields = [
            'id', 'lead', 'file', 'file_url', 'name', 'size',
            'uploaded_by', 'uploaded_by_name', 'created_at'
        ]
        read_only_fields = ['uploaded_by', 'name', 'size']
    
    def get_uploaded_by_name(self, obj):
        if obj.uploaded_by:
            name = f"{obj.uploaded_by.last_name}{obj.uploaded_by.first_name}".strip()
            return name if name else obj.uploaded_by.username
        return ""
    
    def get_file_url(self, obj):
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None


class SalesLeadListSerializer(serializers.ModelSerializer):
    """영업기회 리스트용 Serializer"""
    pipeline_name = serializers.CharField(source='pipeline.name', read_only=True)
    stage_name = serializers.CharField(source='stage.name', read_only=True)
    stage_color = serializers.CharField(source='stage.color', read_only=True)
    company_name = serializers.CharField(source='company.name', read_only=True)
    contact_name = serializers.CharField(source='contact.name', read_only=True)
    owner_name = serializers.SerializerMethodField()
    stalled_days = serializers.IntegerField(read_only=True)
    is_stalled = serializers.BooleanField(read_only=True)
    activities_count = serializers.SerializerMethodField()
    tasks_count = serializers.SerializerMethodField()
    
    class Meta:
        model = SalesLead
        fields = [
            'id', 'title', 'description',
            'pipeline', 'pipeline_name', 'stage', 'stage_name', 'stage_color',
            'company', 'company_name', 'contact', 'contact_name',
            'expected_amount', 'expected_close_date',
            'owner', 'owner_name', 'status', 'probability',
            'stalled_days', 'is_stalled',
            'last_contacted_at', 'next_action_due_at',
            'activities_count', 'tasks_count',
            'created_at', 'updated_at',
            'source', 'tags'
        ]
    
    def get_owner_name(self, obj):
        if obj.owner:
            name = f"{obj.owner.last_name}{obj.owner.first_name}".strip()
            return name if name else obj.owner.username
        return ""
    
    def get_activities_count(self, obj):
        return obj.activities.count()
    
    def get_tasks_count(self, obj):
        return obj.tasks.filter(is_completed=False).count()


class SalesLeadDetailSerializer(serializers.ModelSerializer):
    """영업기회 상세용 Serializer"""
    pipeline_name = serializers.CharField(source='pipeline.name', read_only=True)
    stage_name = serializers.CharField(source='stage.name', read_only=True)
    stage_color = serializers.CharField(source='stage.color', read_only=True)
    stage_type = serializers.CharField(source='stage.stage_type', read_only=True)
    
    company_data = CustomerCompanySerializer(source='company', read_only=True)
    contact_data = CustomerContactSerializer(source='contact', read_only=True)
    
    owner_data = SimpleUserSerializer(source='owner', read_only=True)
    assignees_data = SimpleUserSerializer(source='assignees', many=True, read_only=True)
    created_by_data = SimpleUserSerializer(source='created_by', read_only=True)
    
    # 관련 데이터
    activities = serializers.SerializerMethodField()
    tasks = LeadTaskSerializer(many=True, read_only=True)
    files = LeadFileSerializer(many=True, read_only=True)
    
    # 계산 필드
    stalled_days = serializers.IntegerField(read_only=True)
    is_stalled = serializers.BooleanField(read_only=True)
    quotes_count = serializers.SerializerMethodField()
    
    class Meta:
        model = SalesLead
        fields = [
            'id', 'title', 'description',
            'pipeline', 'pipeline_name', 'stage', 'stage_name', 'stage_color', 'stage_type',
            'company', 'company_data', 'contact', 'contact_data',
            'expected_amount', 'expected_close_date',
            'owner', 'owner_data', 'assignees', 'assignees_data',
            'status', 'probability', 'lost_reason',
            'stage_entered_at', 'last_contacted_at', 'next_action_due_at',
            'stalled_days', 'is_stalled',
            'contract_id', 'project_id', 'source', 'utm', 'tags',
            'created_by', 'created_by_data', 'created_at', 'updated_at',
            'activities', 'tasks', 'files', 'quotes_count'
        ]
        read_only_fields = ['created_by', 'stage_entered_at']
    
    def get_quotes_count(self, obj):
        return obj.quotes.count()
    
    def get_activities(self, obj):
        from django.db.models.functions import Coalesce
        activities = obj.activities.annotate(
            effective_date=Coalesce('activity_date', 'created_at')
        ).order_by('-effective_date')
        return LeadActivitySerializer(activities, many=True).data


class SalesLeadCreateSerializer(serializers.ModelSerializer):
    """영업기회 생성용 Serializer"""
    
    class Meta:
        model = SalesLead
        fields = [
            'id', 'title', 'description',
            'pipeline', 'stage',
            'company', 'contact',
            'expected_amount', 'expected_close_date',
            'owner', 'assignees',
            'status', 'probability', 'lost_reason',
            'next_action_due_at', 'source', 'utm', 'tags'
        ]
    
    def validate(self, attrs):
        """
        ✅ workspace 우선 스코프 검증
        - pipeline.workspace == request workspace
        - stage.pipeline == pipeline
        - (선택) company.workspace == request workspace
        - (선택) contact.company.workspace == request workspace
        """
        workspace = self.context.get("workspace")
        pipeline = attrs.get("pipeline")
        stage = attrs.get("stage")
        company = attrs.get("company")
        contact = attrs.get("contact")

        if workspace and pipeline and getattr(pipeline, "workspace_id", None) not in (workspace.id, None):
            raise serializers.ValidationError({"pipeline": "현재 워크스페이스의 파이프라인만 선택할 수 있습니다."})

        if stage and pipeline and stage.pipeline_id != pipeline.id:
            raise serializers.ValidationError({"stage": "선택한 stage는 pipeline에 속해있어야 합니다."})

        if self.instance and pipeline and not stage:
            current_stage = getattr(self.instance, "stage", None)
            if current_stage and current_stage.pipeline_id != pipeline.id:
                raise serializers.ValidationError({"stage": "pipeline 변경 시 stage를 함께 선택해주세요."})

        if workspace and company and getattr(company, "workspace_id", None) not in (workspace.id, None):
            raise serializers.ValidationError({"company": "현재 워크스페이스의 고객사만 선택할 수 있습니다."})

        if contact:
            # contact는 company를 통해 workspace를 판단
            c_ws_id = getattr(getattr(contact, "company", None), "workspace_id", None)
            if workspace and c_ws_id not in (workspace.id, None):
                raise serializers.ValidationError({"contact": "현재 워크스페이스의 담당자만 선택할 수 있습니다."})

        # stage 기본 확률 자동 반영(요청값이 없거나 0이면)
        if stage and (not attrs.get("probability")):
            attrs["probability"] = stage.probability

        return attrs
    
    def create(self, validated_data):
        assignees = validated_data.pop('assignees', [])
        
        # 단계의 기본 확률 적용
        if 'probability' not in validated_data or validated_data['probability'] == 0:
            stage = validated_data.get('stage')
            if stage:
                validated_data['probability'] = stage.probability
        
        lead = SalesLead.objects.create(**validated_data)
        lead.assignees.set(assignees)
        
        return lead

    def update(self, instance, validated_data):
        from .services import LeadService

        request = self.context.get("request")
        assignees = validated_data.pop("assignees", None)
        new_stage = validated_data.pop("stage", None)
        stage_note = ""
        if request:
            stage_note = request.data.get("stage_note") or request.data.get("note", "")

        stage_changed = new_stage and new_stage.id != instance.stage_id
        if stage_changed:
            # stage change should control status/probability unless explicitly overridden
            validated_data.pop("status", None)
            LeadService.move_stage(instance, new_stage, request.user, stage_note)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if assignees is not None:
            instance.assignees.set(assignees)

        return instance


# ============================================================
# 견적서
# ============================================================
class QuoteTemplateSerializer(serializers.ModelSerializer):
    """견적 템플릿 Serializer"""
    created_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = QuoteTemplate
        fields = [
            'id', 'name', 'header_text', 'footer_text', 'terms',
            'is_default', 'created_by', 'created_by_name',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_by']
    
    def get_created_by_name(self, obj):
        if obj.created_by:
            name = f"{obj.created_by.last_name}{obj.created_by.first_name}".strip()
            return name if name else obj.created_by.username
        return ""


class QuoteItemSerializer(serializers.ModelSerializer):
    """견적 항목 Serializer"""
    discount_type_display = serializers.CharField(source='get_discount_type_display', read_only=True)
    
    class Meta:
        model = QuoteItem
        fields = [
            'id', 'quote', 'order',
            # 구분/섹션
            'category',
            # 품목 정보
            'name', 'description', 'specification', 'unit',
            # 수량/금액
            'quantity', 'unit_price', 'amount',
            # 할인
            'discount_type', 'discount_type_display', 'discount_value', 'is_discount_item',
            # 비고
            'remarks', 'notes'
        ]
        read_only_fields = ['amount', 'quote']


class QuoteSerializer(serializers.ModelSerializer):
    """견적서 Serializer"""
    items = QuoteItemSerializer(many=True, read_only=True)
    lead_title = serializers.CharField(source='lead.title', read_only=True)
    company_name = serializers.CharField(source='company.name', read_only=True)
    contact_name = serializers.CharField(source='contact.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    tax_mode_display = serializers.CharField(source='get_tax_mode_display', read_only=True)
    rounding_type_display = serializers.CharField(source='get_rounding_type_display', read_only=True)
    validity_type_display = serializers.CharField(source='get_validity_type_display', read_only=True)
    created_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Quote
        fields = [
            'id', 'lead', 'lead_title', 'company', 'company_name',
            'contact', 'contact_name',
            'quote_number', 'title',
            # 문서 식별/버전
            'revision', 'attachment_label',
            # 수신/참조
            'recipient_label', 'cc_recipients',
            # 날짜/유효기간
            'issue_date', 'validity_type', 'validity_type_display', 'validity_days', 'valid_until',
            # 납품/결제 조건
            'delivery_date', 'delivery_note', 'payment_terms',
            # 템플릿
            'template', 'header_text', 'footer_text', 'terms',
            # 세금/라운딩
            'tax_mode', 'tax_mode_display', 'tax_rate',
            'rounding_type', 'rounding_type_display', 'rounding_unit',
            # 금액
            'subtotal', 'tax_amount', 'total_amount', 'total_amount_korean',
            # 비고/메모
            'customer_notes', 'internal_memo', 'show_notes_on_separate_page', 'notes',
            # 상태
            'status', 'status_display', 'sent_at',
            # 메타
            'items', 'created_by', 'created_by_name', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'created_by', 'quote_number', 'subtotal', 'tax_amount',
            'total_amount', 'total_amount_korean'
        ]
    
    def get_created_by_name(self, obj):
        if obj.created_by:
            name = f"{obj.created_by.last_name}{obj.created_by.first_name}".strip()
            return name if name else obj.created_by.username
        return ""


class QuoteCreateSerializer(serializers.ModelSerializer):
    """견적서 생성 Serializer"""
    items = QuoteItemSerializer(many=True, required=False)
    
    class Meta:
        model = Quote
        fields = [
            'lead', 'company', 'contact', 'title', 'template',
            # 문서 식별/버전
            'revision', 'attachment_label',
            # 수신/참조
            'recipient_label', 'cc_recipients',
            # 날짜/유효기간
            'issue_date', 'validity_type', 'validity_days', 'valid_until',
            # 납품/결제 조건
            'delivery_date', 'delivery_note', 'payment_terms',
            # 템플릿/텍스트
            'header_text', 'footer_text', 'terms',
            # 세금/라운딩
            'tax_mode', 'tax_rate', 'rounding_type', 'rounding_unit',
            # 비고/메모
            'customer_notes', 'internal_memo', 'show_notes_on_separate_page', 'notes',
            # 항목
            'items'
        ]
    
    def validate(self, attrs):
        """
        ✅ workspace 우선 스코프 검증
        - lead.workspace == request workspace
        - template.workspace == request workspace (선택)
        - company.workspace == request workspace (선택)
        - contact.company.workspace == request workspace (선택)
        """
        workspace = self.context.get("workspace")
        lead = attrs.get("lead")
        template = attrs.get("template")
        company = attrs.get("company")
        contact = attrs.get("contact")

        if workspace and lead and getattr(lead, "workspace_id", None) not in (workspace.id, None):
            raise serializers.ValidationError({"lead": "현재 워크스페이스의 리드만 선택할 수 있습니다."})

        if workspace and template and getattr(template, "workspace_id", None) not in (workspace.id, None):
            raise serializers.ValidationError({"template": "현재 워크스페이스의 템플릿만 선택할 수 있습니다."})

        if workspace and company and getattr(company, "workspace_id", None) not in (workspace.id, None):
            raise serializers.ValidationError({"company": "현재 워크스페이스의 고객사만 선택할 수 있습니다."})

        if contact:
            c_ws_id = getattr(getattr(contact, "company", None), "workspace_id", None)
            if workspace and c_ws_id not in (workspace.id, None):
                raise serializers.ValidationError({"contact": "현재 워크스페이스의 담당자만 선택할 수 있습니다."})

        return attrs

    def create(self, validated_data):
        from django.utils import timezone
        from datetime import timedelta
        
        items_data = validated_data.pop('items', [])
        
        # 견적일자 기본값 설정
        if not validated_data.get('issue_date'):
            validated_data['issue_date'] = timezone.now().date()
        
        # 유효기간 계산 (validity_type에 따라)
        validity_type = validated_data.get('validity_type', 'days')
        if validity_type == 'days' and not validated_data.get('valid_until'):
            validity_days = validated_data.get('validity_days', 30)
            issue_date = validated_data.get('issue_date')
            validated_data['valid_until'] = issue_date + timedelta(days=validity_days)
        
        # 견적번호 자동 생성
        today = timezone.now().strftime('%Y%m%d')
        # ✅ workspace별 시퀀스(추후 quote_number unique를 workspace로 바꿀 때도 안전)
        workspace = self.context.get("workspace")
        qs = Quote.objects.filter(quote_number__startswith=f"Q{today}")
        if workspace:
            qs = qs.filter(workspace=workspace)
        count = qs.count() + 1
        validated_data['quote_number'] = f"Q{today}-{count:03d}"
        
        # 템플릿에서 기본값 로드
        template = validated_data.get('template')
        if template:
            if not validated_data.get('header_text'):
                validated_data['header_text'] = template.header_text
            if not validated_data.get('footer_text'):
                validated_data['footer_text'] = template.footer_text
            if not validated_data.get('terms'):
                validated_data['terms'] = template.terms
        
        quote = Quote.objects.create(**validated_data)
        
        # 견적 항목 생성
        for idx, item_data in enumerate(items_data):
            QuoteItem.objects.create(quote=quote, order=idx, **item_data)
        
        # 합계 계산 (라운딩/VAT 모드 적용)
        quote.calculate_totals()
        
        return quote

    def update(self, instance, validated_data):
        from django.utils import timezone
        from datetime import timedelta
        
        items_data = validated_data.pop("items", None)
        
        # 유효기간 재계산 (validity_type이 days이고 값이 변경된 경우)
        validity_type = validated_data.get('validity_type', instance.validity_type)
        if validity_type == 'days':
            validity_days = validated_data.get('validity_days', instance.validity_days)
            issue_date = validated_data.get('issue_date', instance.issue_date)
            if issue_date:
                validated_data['valid_until'] = issue_date + timedelta(days=validity_days)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if items_data is not None:
            instance.items.all().delete()
            for idx, item_data in enumerate(items_data):
                QuoteItem.objects.create(quote=instance, order=idx, **item_data)
            instance.calculate_totals()

        return instance


class SalesContractLinkSerializer(serializers.ModelSerializer):
    """계약 연결 Serializer"""
    class Meta:
        model = SalesContractLink
        fields = [
            'id', 'workspace', 'lead', 'contract_id', 'notes',
            'created_by', 'created_at'
        ]
        read_only_fields = ['created_by']


class TenderSerializer(serializers.ModelSerializer):
    """입찰 Serializer"""
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    lead_title = serializers.CharField(source='lead.title', read_only=True)

    class Meta:
        model = Tender
        fields = [
            'id', 'workspace', 'lead', 'lead_title', 'title', 'description', 'notice_url',
            'deadline', 'bond_amount', 'documents', 'status', 'status_display',
            'submitted_at', 'result_note',
            'created_by', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_by']


class RevenueMilestoneSerializer(serializers.ModelSerializer):
    """매출 계획 Serializer"""
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    lead_title = serializers.CharField(source='lead.title', read_only=True)

    class Meta:
        model = RevenueMilestone
        fields = [
            'id', 'workspace', 'lead', 'lead_title', 'contract_id', 'title',
            'planned_amount', 'planned_date', 'status', 'status_display',
            'notes', 'created_by', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_by']


class CollectionSerializer(serializers.ModelSerializer):
    """수금 Serializer"""
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    milestone_title = serializers.CharField(source='milestone.title', read_only=True)
    lead_title = serializers.CharField(source='lead.title', read_only=True)

    class Meta:
        model = Collection
        fields = [
            'id', 'workspace', 'lead', 'lead_title', 'milestone', 'milestone_title',
            'amount', 'due_date', 'received_at', 'status', 'status_display',
            'notes', 'created_by', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_by']


class EmailTemplateSerializer(serializers.ModelSerializer):
    """이메일 템플릿 Serializer"""
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = EmailTemplate
        fields = [
            'id', 'workspace', 'name', 'subject', 'body_html',
            'variables_schema', 'created_by', 'created_by_name',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_by']

    def get_created_by_name(self, obj):
        if obj.created_by:
            name = f"{obj.created_by.last_name}{obj.created_by.first_name}".strip()
            return name if name else obj.created_by.username
        return ""


class EmailSignatureSerializer(serializers.ModelSerializer):
    """이메일 서명 Serializer"""
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = EmailSignature
        fields = [
            'id', 'workspace', 'name', 'html', 'is_default',
            'created_by', 'created_by_name',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_by']

    def get_created_by_name(self, obj):
        if obj.created_by:
            name = f"{obj.created_by.last_name}{obj.created_by.first_name}".strip()
            return name if name else obj.created_by.username
        return ""


class EmailSendLogSerializer(serializers.ModelSerializer):
    """이메일 발송 로그 Serializer"""
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = EmailSendLog
        fields = [
            'id', 'workspace', 'lead', 'to', 'subject', 'body_snapshot',
            'status', 'status_display', 'scheduled_at', 'sent_at', 'error_message',
            'created_by', 'created_at'
        ]
        read_only_fields = ['created_by']


class InboxAcceptSerializer(serializers.Serializer):
    """
    인박스 접수 처리:
      - owner 지정
      - stage 이동
      - next action TODO 생성(옵션)
    """
    owner_id = serializers.IntegerField(required=False, allow_null=True)
    stage_id = serializers.IntegerField(required=False, allow_null=True)
    note = serializers.CharField(required=False, allow_blank=True, default="")

    create_task = serializers.BooleanField(required=False, default=False)
    task_title = serializers.CharField(required=False, allow_blank=True, default="")
    task_due_date = serializers.DateTimeField(required=False, allow_null=True)
    task_priority = serializers.ChoiceField(
        required=False, default="medium",
        choices=[("low","low"),("medium","medium"),("high","high")]
    )
    task_assignee_id = serializers.IntegerField(required=False, allow_null=True)

    def validate(self, attrs):
        if attrs.get("create_task"):
            if not attrs.get("task_title"):
                raise serializers.ValidationError({"task_title": "TODO 제목이 필요합니다."})
        return attrs


# ============================================================
# 캘린더 피드용
# ============================================================
class CalendarEventSerializer(serializers.Serializer):
    """캘린더 이벤트 통합 Serializer"""
    id = serializers.CharField()
    title = serializers.CharField()
    start = serializers.DateTimeField()
    end = serializers.DateTimeField(allow_null=True)
    event_type = serializers.CharField()  # 'task', 'close_date', 'meeting'
    source_id = serializers.IntegerField(allow_null=True)
    lead_id = serializers.IntegerField()
    lead_title = serializers.CharField()
    color = serializers.CharField()
    is_completed = serializers.BooleanField(default=False)
