# backend/project/reports_views.py
"""
주간 업무 보고 API Views
- 주간 집계 조회 (사람별)
- 영업관리 주간 집계 (관리자 전용)
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.db.models import Q, Prefetch
from django.utils.dateparse import parse_date
from datetime import timedelta, datetime

from meeting.models import Schedule
from operation.models import SalesLead, Quote, Tender
from project.models import WorkDiaryEntry, Project, Task
from core.models import CustomUser, UserMembership


def get_week_range(base_date):
    """월요일~일요일 범위 반환"""
    if isinstance(base_date, str):
        base_date = parse_date(base_date)
    if base_date is None:
        base_date = datetime.now().date()
    day_of_week = base_date.weekday()  # 0=월, 6=일
    monday = base_date - timedelta(days=day_of_week)
    sunday = monday + timedelta(days=6)
    return monday, sunday


def get_week_label(monday):
    """주간 라벨 생성 (예: 1월 4주차)"""
    month = monday.month
    # 해당 월의 첫 월요일 기준으로 몇 번째 주인지 계산
    first_day_of_month = monday.replace(day=1)
    first_monday = first_day_of_month + timedelta(days=(7 - first_day_of_month.weekday()) % 7)
    if first_monday.month != month:
        first_monday = first_day_of_month
    week_num = ((monday - first_monday).days // 7) + 1
    return f"{month}월 {week_num}주차"


def is_manager(user):
    """시스템 관리자 권한(is_staff) 여부 확인"""
    return user.is_staff



class WeeklyReportView(APIView):
    """
    주간 업무 집계 조회 API (사람별)
    - 업무일지(WorkDiaryEntry) 기반 집계
    GET /project/reports/weekly/?week_start=2026-01-19&project_id=1
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # 파라미터 파싱
        week_start_str = request.query_params.get('week_start')
        project_id = request.query_params.get('project_id')
        user_id = request.query_params.get('user_id')
        
        # 주간 범위 계산
        if week_start_str:
            base_date = parse_date(week_start_str)
        else:
            base_date = datetime.now().date()
        
        current_monday, current_sunday = get_week_range(base_date)
        prev_monday = current_monday - timedelta(days=7)
        prev_sunday = prev_monday + timedelta(days=6)

        # ---------------------------------------------------------
        # 1. 쿼리: 전주 ~ 금주 모든 업무일지 가져오기
        # ---------------------------------------------------------
        qs = WorkDiaryEntry.objects.filter(
            date__gte=prev_monday, 
            date__lte=current_sunday
        ).select_related('project', 'task', 'user')

        if project_id:
            qs = qs.filter(project_id=project_id)
        if user_id:
            qs = qs.filter(user_id=user_id)

        # ---------------------------------------------------------
        # 2. 그루핑: Project > Task > Entry
        # ---------------------------------------------------------
        projects_map = {} 

        for entry in qs:
            # Project 키
            p_id = entry.project_id or 0
            p_name = entry.project.name if entry.project else "기타(미분류)"
            
            if p_id not in projects_map:
                projects_map[p_id] = {
                    'id': p_id,
                    'name': p_name,
                    'tasks': {}
                }
            
            # Task 키
            t_id = entry.task_id or 0
            # Task 소제목 결정
            if entry.task:
                t_title = entry.task.title
                t_status = entry.task.status
            else:
                t_title = "일반 업무"
                t_status = None
                
            if t_id not in projects_map[p_id]['tasks']:
                projects_map[p_id]['tasks'][t_id] = {
                    'id': t_id,
                    'title': t_title,
                    'status': t_status,
                    'prev_participants': {},    # 전주 참여자
                    'curr_participants': {},    # 금주 참여자
                    'prev_items': [],
                    'current_items': []
                }
            
            task_node = projects_map[p_id]['tasks'][t_id]
            
            # 사용자 정보
            u_id = entry.user.id
            user_info = {
                'id': u_id, 
                'name': f"{entry.user.last_name}{entry.user.first_name}" if entry.user.last_name else entry.user.username
            }
            
            # 항목 데이터
            item_data = {
                'id': entry.id,
                'date': entry.date.isoformat(),
                'content': entry.content,
                'user_name': user_info['name']
            }
            
            # 전주 vs 금주 분류
            if prev_monday <= entry.date <= prev_sunday:
                task_node['prev_items'].append(item_data)
                if u_id not in task_node['prev_participants']:
                    task_node['prev_participants'][u_id] = user_info
            elif current_monday <= entry.date <= current_sunday:
                task_node['current_items'].append(item_data)
                if u_id not in task_node['curr_participants']:
                    task_node['curr_participants'][u_id] = user_info

        # ---------------------------------------------------------
        # 3. 결과 포맷팅 (List 변환)
        # ---------------------------------------------------------
        final_projects = []
        
        # 프로젝트 정렬 (이름순)
        sorted_p_ids = sorted(projects_map.keys(), key=lambda k: projects_map[k]['name'])
        
        for p_id in sorted_p_ids:
            p_node = projects_map[p_id]
            tasks_list = []
            
            sorted_t_ids = sorted(p_node['tasks'].keys())
            
            for t_id in sorted_t_ids:
                t_node = p_node['tasks'][t_id]
                
                prev_len = len(t_node['prev_items'])
                curr_len = len(t_node['current_items'])
                
                tasks_list.append({
                    'id': t_node['id'],
                    'title': t_node['title'],
                    'status': t_node['status'],
                    'prev_participants': list(t_node['prev_participants'].values()),
                    'current_participants': list(t_node['curr_participants'].values()),
                    'prev_items': sorted(t_node['prev_items'], key=lambda x: x['date']),
                    'current_items': sorted(t_node['current_items'], key=lambda x: x['date']),
                    'is_new': prev_len == 0 and curr_len > 0,
                    'is_completed': t_node['status'] == 'completed'
                })
            
            final_projects.append({
                'id': p_node['id'],
                'name': p_node['name'],
                'tasks': tasks_list
            })

        return Response({
            'period': {
                'prev': {
                    'label': get_week_label(prev_monday),
                    'start': prev_monday.isoformat(),
                    'end': prev_sunday.isoformat()
                },
                'current': {
                    'label': get_week_label(current_monday),
                    'start': current_monday.isoformat(),
                    'end': current_sunday.isoformat()
                }
            },
            'projects': final_projects
        })


class SalesWeeklyReportView(APIView):
    """
    영업관리 주간 집계 조회 API (관리자 전용)
    GET /project/reports/sales-weekly/?week_start=2026-01-19
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # 권한 확인 (Position.level <= 2 또는 staff)
        if not is_manager(request.user):
            return Response(
                {'error': '관리자 권한이 필요합니다.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # 파라미터 파싱
        week_start_str = request.query_params.get('week_start')
        
        if week_start_str:
            base_date = parse_date(week_start_str)
        else:
            base_date = datetime.now().date()
        
        current_monday, current_sunday = get_week_range(base_date)
        prev_monday = current_monday - timedelta(days=7)
        prev_sunday = prev_monday + timedelta(days=6)

        result = {
            'current_week': {
                'start': current_monday.isoformat(),
                'end': current_sunday.isoformat(),
                'label': get_week_label(current_monday)
            },
            'prev_week': {
                'start': prev_monday.isoformat(),
                'end': prev_sunday.isoformat(),
                'label': get_week_label(prev_monday)
            },
            'categories': []
        }

        # 1. 영업관리 (SalesLead)
        prev_leads = SalesLead.objects.filter(
            created_at__date__gte=prev_monday,
            created_at__date__lte=prev_sunday
        ).select_related('company', 'stage', 'owner').values(
            'id', 'title', 'company__name', 'stage__name', 'status', 'owner__username'
        ).order_by('-created_at')

        current_leads = SalesLead.objects.filter(
            created_at__date__gte=current_monday,
            created_at__date__lte=current_sunday
        ).select_related('company', 'stage', 'owner').values(
            'id', 'title', 'company__name', 'stage__name', 'status', 'owner__username'
        ).order_by('-created_at')

        result['categories'].append({
            'name': '영업관리',
            'icon': 'briefcase',
            'prev_week_items': [
                {
                    'id': item['id'],
                    'title': item['title'],
                    'customer_name': item['company__name'] or '',
                    'stage': item['stage__name'] or '',
                    'status': item['status'],
                    'owner': item['owner__username'] or '',
                }
                for item in prev_leads
            ],
            'current_week_items': [
                {
                    'id': item['id'],
                    'title': item['title'],
                    'customer_name': item['company__name'] or '',
                    'stage': item['stage__name'] or '',
                    'status': item['status'],
                    'owner': item['owner__username'] or '',
                }
                for item in current_leads
            ]
        })

        # 2. 견적/고객 (Quote)
        prev_quotes = Quote.objects.filter(
            created_at__date__gte=prev_monday,
            created_at__date__lte=prev_sunday
        ).select_related('company', 'lead').values(
            'id', 'quote_number', 'title', 'company__name', 'status', 'total_amount'
        ).order_by('-created_at')

        current_quotes = Quote.objects.filter(
            created_at__date__gte=current_monday,
            created_at__date__lte=current_sunday
        ).select_related('company', 'lead').values(
            'id', 'quote_number', 'title', 'company__name', 'status', 'total_amount'
        ).order_by('-created_at')

        result['categories'].append({
            'name': '견적/고객',
            'icon': 'file-text',
            'prev_week_items': [
                {
                    'id': item['id'],
                    'quote_number': item['quote_number'],
                    'title': item['title'],
                    'customer_name': item['company__name'] or '',
                    'status': item['status'],
                    'total_amount': str(item['total_amount']) if item['total_amount'] else '0',
                }
                for item in prev_quotes
            ],
            'current_week_items': [
                {
                    'id': item['id'],
                    'quote_number': item['quote_number'],
                    'title': item['title'],
                    'customer_name': item['company__name'] or '',
                    'status': item['status'],
                    'total_amount': str(item['total_amount']) if item['total_amount'] else '0',
                }
                for item in current_quotes
            ]
        })

        # 3. 입찰/정산 (Tender)
        prev_tenders = Tender.objects.filter(
            created_at__date__gte=prev_monday,
            created_at__date__lte=prev_sunday
        ).select_related('lead__company').values(
            'id', 'title', 'lead__company__name', 'status', 'deadline'
        ).order_by('-created_at')

        current_tenders = Tender.objects.filter(
            created_at__date__gte=current_monday,
            created_at__date__lte=current_sunday
        ).select_related('lead__company').values(
            'id', 'title', 'lead__company__name', 'status', 'deadline'
        ).order_by('-created_at')

        result['categories'].append({
            'name': '입찰/정산',
            'icon': 'gavel',
            'prev_week_items': [
                {
                    'id': item['id'],
                    'title': item['title'],
                    'customer_name': item['lead__company__name'] or '',
                    'status': item['status'],
                    'deadline': item['deadline'].isoformat() if item['deadline'] else None,
                }
                for item in prev_tenders
            ],
            'current_week_items': [
                {
                    'id': item['id'],
                    'title': item['title'],
                    'customer_name': item['lead__company__name'] or '',
                    'status': item['status'],
                    'deadline': item['deadline'].isoformat() if item['deadline'] else None,
                }
                for item in current_tenders
            ]
        })

        return Response(result)
