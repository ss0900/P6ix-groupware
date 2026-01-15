# backend/operation/services/lead_service.py
"""
영업관리(Operation) 모듈 - Lead Service Layer
단계 이동, 자동 활동 기록 등 비즈니스 로직
"""
from django.utils import timezone
from django.db import transaction
from django.core.exceptions import PermissionDenied
from django.db.models import Q

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
    def refresh_next_action_due(lead):
        """
        Recalculate lead.next_action_due_at based on open tasks.
        """
        next_task = lead.tasks.filter(
            is_completed=False, due_date__isnull=False
        ).order_by("due_date").first()
        lead.next_action_due_at = next_task.due_date if next_task else None
        lead.save(update_fields=["next_action_due_at"])
        return lead.next_action_due_at
    
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

        # 다음 액션 예정일 갱신
        lead = task.lead
        LeadService.refresh_next_action_due(lead)
        
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
    def get_inbox_leads(user, workspace):
        """
        접수함: 신규 접수된 리드 (담당자 미배정 또는 첫 단계에 있는 것)
        
        Args:
            user: 현재 사용자
        
        Returns:
            QuerySet of SalesLead
        """
        from operation.models import SalesLead, SalesStage
        
        # ✅ 해당 workspace 파이프라인의 "첫 단계(order=0)"만
        first_stages = SalesStage.objects.filter(
            order=0,
            pipeline__workspace=workspace,
        ).values_list('id', flat=True)
        
        return SalesLead.objects.filter(
            status='active',
            workspace=workspace,
        ).filter(
            Q(stage_id__in=first_stages) |
            Q(owner__isnull=True)
        ).order_by('-created_at')


    @staticmethod
    @transaction.atomic
    def accept_inbox(
        lead,
        user,
        workspace,
        owner_id=None,
        stage_id=None,
        note="",
        create_task=False,
        task_title="",
        task_due_date=None,
        task_priority="medium",
        task_assignee_id=None,
    ):
        """
        접수 처리(서버 확정 기록)
        - owner 지정(기본: lead.owner가 없으면 현재 user)
        - stage 이동(옵션; 미지정이면 '다음 단계'로 자동 시도)
        - 다음 액션 TODO 생성(옵션)
        - accept_activity(노트) 남김 + stage 이동 시 stage_activity는 move_stage가 생성
        """
        from operation.models import SalesStage, LeadTask
        from django.contrib.auth import get_user_model

        if lead.workspace_id != workspace.id:
            raise ValueError("Workspace mismatch")

        User = get_user_model()

        owner_changed = False
        stage_activity = None

        # 1) owner 결정
        if owner_id:
            owner = User.objects.get(id=owner_id)
            if lead.owner_id != owner.id:
                lead.owner = owner
                owner_changed = True
        else:
            if lead.owner_id is None:
                lead.owner = user
                owner_changed = True

        if owner_changed:
            lead.save(update_fields=["owner"])

        # 2) stage 결정 (stage_id 없으면 다음 단계 자동)
        target_stage = None
        if stage_id:
            target_stage = SalesStage.objects.get(id=stage_id, pipeline=lead.pipeline)
        else:
            # 다음 단계 자동 (order 기준)
            target_stage = (
                SalesStage.objects.filter(pipeline=lead.pipeline, order__gt=lead.stage.order)
                .order_by("order")
                .first()
            )

        if target_stage and target_stage.id != lead.stage_id:
            stage_activity = LeadService.move_stage(lead, target_stage, user, note=note)

        # 3) TODO 생성(옵션)
        created_task = None
        if create_task:
            assignee = None
            if task_assignee_id:
                assignee = User.objects.get(id=task_assignee_id)
            else:
                assignee = lead.owner or user

            title = task_title.strip() or "다음 액션"

            created_task = LeadTask.objects.create(
                lead=lead,
                title=title,
                description=note or "",
                assignee=assignee,
                due_date=task_due_date,
                priority=task_priority,
                show_on_calendar=True,
                created_by=user,
            )

            # next_action_due_at 동기화(있으면)
            if task_due_date:
                lead.next_action_due_at = task_due_date
                lead.save(update_fields=["next_action_due_at"])
            else:
                LeadService.refresh_next_action_due(lead)

        # 4) 접수 처리 활동(노트) - owner/할일 생성/단계 이동을 한 번에 요약
        summary_bits = []
        if owner_changed:
            summary_bits.append(f"담당자: {lead.owner.username if lead.owner else '-'}")
        if target_stage:
            summary_bits.append(f"단계: {lead.stage.name if lead.stage else '-'}")
        if created_task:
            summary_bits.append(f"TODO: {created_task.title}")

        accept_activity = LeadService.create_activity(
            lead=lead,
            activity_type="note",
            title="접수 처리",
            content=" / ".join(summary_bits) + (f"\n\n{note}" if note else ""),
            user=user,
        )

        return {
            "lead": lead,
            "stage_activity": stage_activity,
            "task": created_task,
            "accept_activity": accept_activity,
        }
