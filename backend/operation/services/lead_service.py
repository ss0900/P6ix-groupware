# backend/operation/services/lead_service.py
"""
영업 기회(Lead) 관련 비즈니스 로직 서비스 레이어
- 단계 이동 시 자동 히스토리 기록
- 활동 추가
- 파일 업로드
- 태스크 완료
"""
from django.utils import timezone
from django.db import transaction
from ..models import (
    SalesOpportunity, SalesStage, LeadActivity, LeadTask, LeadFile
)


class LeadService:
    """영업 기회 관련 서비스"""
    
    @staticmethod
    @transaction.atomic
    def move_stage(lead: SalesOpportunity, new_stage: SalesStage, user) -> LeadActivity:
        """
        단계 이동 + 활동 자동 기록
        칸반 드래그앤드롭 시 호출
        """
        old_stage = lead.stage
        old_stage_name = old_stage.name if old_stage else "없음"
        new_stage_name = new_stage.name
        
        # 단계 업데이트
        lead.stage = new_stage
        lead.stage_entered_at = timezone.now()
        
        # 파이프라인도 일치시킴
        if new_stage.pipeline != lead.pipeline:
            lead.pipeline = new_stage.pipeline
        
        # 단계 유형에 따른 상태 업데이트
        if new_stage.stage_type == "won":
            lead.status = "won"
        elif new_stage.stage_type == "lost":
            lead.status = "lost"
        else:
            # 기존 won/lost가 아닌 경우만 negotiation으로 변경
            if lead.status not in ["won", "lost"]:
                # 단계 순서에 따라 status 유추 (간단 로직)
                if new_stage.order <= 1:
                    lead.status = "lead"
                elif new_stage.order == 2:
                    lead.status = "contact"
                elif new_stage.order == 3:
                    lead.status = "proposal"
                else:
                    lead.status = "negotiation"
        
        lead.save()
        
        # 활동 자동 기록
        activity = LeadActivity.objects.create(
            lead=lead,
            activity_type="stage_change",
            title=f"단계 변경: {old_stage_name} → {new_stage_name}",
            content=f"담당자가 단계를 '{old_stage_name}'에서 '{new_stage_name}'(으)로 변경했습니다.",
            is_system=True,
            created_by=user
        )
        
        return activity
    
    @staticmethod
    def add_activity(
        lead: SalesOpportunity,
        activity_type: str,
        title: str,
        content: str,
        user,
        is_system: bool = False
    ) -> LeadActivity:
        """활동 추가"""
        activity = LeadActivity.objects.create(
            lead=lead,
            activity_type=activity_type,
            title=title,
            content=content,
            is_system=is_system,
            created_by=user
        )
        
        # 활동 유형에 따른 last_contacted_at 업데이트
        if activity_type in ["call", "meeting", "email"]:
            lead.last_contacted_at = timezone.now().date()
            lead.save(update_fields=["last_contacted_at"])
        
        return activity
    
    @staticmethod
    @transaction.atomic
    def add_file(lead: SalesOpportunity, file, user) -> tuple:
        """
        파일 업로드 + 활동 자동 기록
        Returns: (LeadFile, LeadActivity)
        """
        lead_file = LeadFile.objects.create(
            lead=lead,
            file=file,
            filename=file.name,
            uploaded_by=user
        )
        
        activity = LeadActivity.objects.create(
            lead=lead,
            activity_type="file_add",
            title=f"파일 추가: {file.name}",
            content=f"'{file.name}' 파일이 추가되었습니다.",
            is_system=True,
            created_by=user
        )
        
        return lead_file, activity
    
    @staticmethod
    @transaction.atomic
    def complete_task(task: LeadTask, user) -> LeadActivity:
        """
        태스크 완료 + 활동 자동 기록
        """
        task.is_completed = True
        task.completed_at = timezone.now()
        task.save()
        
        activity = LeadActivity.objects.create(
            lead=task.lead,
            activity_type="task_done",
            title=f"태스크 완료: {task.title}",
            content=f"'{task.title}' 태스크가 완료되었습니다.",
            is_system=True,
            created_by=user
        )
        
        return activity
    
    @staticmethod
    def create_lead_with_activity(lead_data: dict, user) -> tuple:
        """
        영업 기회 생성 + 생성 활동 자동 기록
        Returns: (SalesOpportunity, LeadActivity)
        """
        lead = SalesOpportunity.objects.create(**lead_data, owner=user)
        
        # 파이프라인의 첫 번째 단계 자동 할당
        if lead.pipeline and not lead.stage:
            first_stage = lead.pipeline.stages.filter(stage_type="open").order_by("order").first()
            if first_stage:
                lead.stage = first_stage
                lead.stage_entered_at = timezone.now()
                lead.save()
        
        activity = LeadActivity.objects.create(
            lead=lead,
            activity_type="created",
            title="영업 기회 생성",
            content=f"'{lead.title}' 영업 기회가 생성되었습니다.",
            is_system=True,
            created_by=user
        )
        
        return lead, activity
    
    @staticmethod
    def record_quote_sent(lead: SalesOpportunity, estimate, user) -> LeadActivity:
        """견적 발송 활동 기록"""
        activity = LeadActivity.objects.create(
            lead=lead,
            activity_type="quote_sent",
            title=f"견적 발송: {estimate.estimate_number}",
            content=f"견적서 '{estimate.title}'(이)가 발송되었습니다. 금액: {estimate.total:,}원",
            is_system=True,
            created_by=user
        )
        return activity
