# backend/operation/services/lead_service.py
"""
영업관리(Operation) 모듈 - Lead Service Layer
단계 이동, 자동 활동 기록 등 비즈니스 로직
"""
from django.utils import timezone
from django.db import transaction


class LeadService:
    """영업기회 관련 비즈니스 로직"""
    
    @staticmethod
    @transaction.atomic
    def move_stage(lead, new_stage, user, note=""):
        """
        리드의 단계를 변경하고 자동 활동 기록 생성
        
        Args:
            lead: SalesLead 인스턴스
            new_stage: SalesStage 인스턴스
            user: 변경을 수행한 사용자
            note: 메모 (선택)
        
        Returns:
            LeadActivity 인스턴스
        """
        from operation.models import LeadActivity
        
        old_stage = lead.stage
        old_status = lead.status
        
        # 같은 단계면 skip
        if old_stage.id == new_stage.id:
            return None
        
        # 단계 변경
        lead.stage = new_stage
        lead.stage_entered_at = timezone.now()
        lead.probability = new_stage.probability
        
        # 단계 유형에 따라 상태 변경
        if new_stage.stage_type == 'won':
            lead.status = 'won'
            activity_type = 'won'
            title = f"수주 완료: {old_stage.name} → {new_stage.name}"
        elif new_stage.stage_type == 'lost':
            lead.status = 'lost'
            activity_type = 'lost'
            title = f"실주 처리: {old_stage.name} → {new_stage.name}"
        else:
            lead.status = 'active'
            activity_type = 'stage_change'
            title = f"단계 변경: {old_stage.name} → {new_stage.name}"
        
        lead.save()
        
        # 활동 로그 생성
        activity = LeadActivity.objects.create(
            lead=lead,
            activity_type=activity_type,
            title=title,
            content=note,
            from_stage=old_stage,
            to_stage=new_stage,
            created_by=user
        )
        
        return activity
    
    @staticmethod
    def create_activity(lead, activity_type, title, content="", user=None, **kwargs):
        """
        활동 로그 생성 헬퍼
        
        Args:
            lead: SalesLead 인스턴스
            activity_type: 활동 유형 (note, call, email, meeting, etc.)
            title: 제목
            content: 내용 (선택)
            user: 작성자
            **kwargs: 추가 필드 (from_stage, to_stage 등)
        
        Returns:
            LeadActivity 인스턴스
        """
        from operation.models import LeadActivity
        
        activity = LeadActivity.objects.create(
            lead=lead,
            activity_type=activity_type,
            title=title,
            content=content,
            created_by=user,
            **kwargs
        )
        
        # 접촉 관련 활동이면 last_contacted_at 업데이트
        if activity_type in ['call', 'email', 'meeting']:
            lead.last_contacted_at = timezone.now()
            lead.save(update_fields=['last_contacted_at'])
        
        return activity
    
    @staticmethod
    @transaction.atomic
    def complete_task(task, user):
        """
        TODO 완료 처리 및 자동 활동 기록
        
        Args:
            task: LeadTask 인스턴스
            user: 완료 처리한 사용자
        
        Returns:
            LeadActivity 인스턴스
        """
        from operation.models import LeadActivity
        
        task.is_completed = True
        task.completed_at = timezone.now()
        task.save()
        
        # 활동 로그 생성
        activity = LeadActivity.objects.create(
            lead=task.lead,
            activity_type='task_done',
            title=f"TO-DO 완료: {task.title}",
            content="",
            created_by=user
        )
        
        return activity
    
    @staticmethod
    @transaction.atomic
    def add_file(lead, file, user):
        """
        파일 추가 및 자동 활동 기록
        
        Args:
            lead: SalesLead 인스턴스
            file: 업로드된 파일
            user: 업로더
        
        Returns:
            tuple (LeadFile, LeadActivity)
        """
        from operation.models import LeadFile, LeadActivity
        
        # 파일 저장
        lead_file = LeadFile.objects.create(
            lead=lead,
            file=file,
            name=file.name,
            size=file.size,
            uploaded_by=user
        )
        
        # 활동 로그 생성
        activity = LeadActivity.objects.create(
            lead=lead,
            activity_type='file_added',
            title=f"파일 추가: {file.name}",
            content=f"파일 크기: {file.size:,} bytes",
            created_by=user
        )
        
        return lead_file, activity
    
    @staticmethod
    @transaction.atomic
    def send_quote(quote, user):
        """
        견적서 발송 처리 및 자동 활동 기록
        
        Args:
            quote: Quote 인스턴스
            user: 발송자
        
        Returns:
            LeadActivity 인스턴스
        """
        from operation.models import LeadActivity
        
        quote.status = 'sent'
        quote.sent_at = timezone.now()
        quote.save()
        
        # 활동 로그 생성
        activity = LeadActivity.objects.create(
            lead=quote.lead,
            activity_type='quote_sent',
            title=f"견적서 발송: {quote.quote_number}",
            content=f"견적 금액: {quote.total_amount:,}원",
            created_by=user
        )
        
        return activity
    
    @staticmethod
    def create_lead_with_activity(lead_data, user):
        """
        리드 생성 및 자동 '생성' 활동 기록
        
        Args:
            lead_data: SalesLead 생성 데이터 (dict)
            user: 생성자
        
        Returns:
            tuple (SalesLead, LeadActivity)
        """
        from operation.models import SalesLead, LeadActivity
        
        with transaction.atomic():
            # 생성자 설정
            lead_data['created_by'] = user
            if not lead_data.get('owner'):
                lead_data['owner'] = user
            
            assignees = lead_data.pop('assignees', [])
            lead = SalesLead.objects.create(**lead_data)
            if assignees:
                lead.assignees.set(assignees)
            
            # 생성 활동 기록
            activity = LeadActivity.objects.create(
                lead=lead,
                activity_type='created',
                title="영업기회 생성",
                content=f"새 영업기회가 생성되었습니다: {lead.title}",
                created_by=user
            )
            
            return lead, activity
    
    @staticmethod
    def get_inbox_leads(user):
        """
        접수함: 신규 접수된 리드 (담당자 미배정 또는 첫 단계에 있는 것)
        
        Args:
            user: 현재 사용자
        
        Returns:
            QuerySet of SalesLead
        """
        from operation.models import SalesLead, SalesStage
        
        # 첫 단계(order=0) 또는 담당자 미배정
        first_stages = SalesStage.objects.filter(order=0).values_list('id', flat=True)
        
        return SalesLead.objects.filter(
            status='active'
        ).filter(
            models.Q(stage_id__in=first_stages) |
            models.Q(owner__isnull=True)
        ).order_by('-created_at')


# Django models import for Q filter
from django.db import models
