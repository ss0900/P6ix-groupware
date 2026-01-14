# backend/operation/filters.py
"""
영업관리(Operation) 모듈 - Filters
"""
import django_filters
from django.db.models import F, ExpressionWrapper, fields
from django.utils import timezone
from datetime import timedelta
from .models import (
    CustomerCompany, CustomerContact,
    SalesLead, LeadTask, Quote
)


class CustomerCompanyFilter(django_filters.FilterSet):
    """고객사 필터"""
    name = django_filters.CharFilter(lookup_expr='icontains')
    industry = django_filters.CharFilter(lookup_expr='icontains')
    
    class Meta:
        model = CustomerCompany
        fields = ['name', 'industry']


class CustomerContactFilter(django_filters.FilterSet):
    """고객 담당자 필터"""
    name = django_filters.CharFilter(lookup_expr='icontains')
    company = django_filters.NumberFilter()
    
    class Meta:
        model = CustomerContact
        fields = ['name', 'company']


class SalesLeadFilter(django_filters.FilterSet):
    """영업기회 필터"""
    # 기본 필터
    pipeline = django_filters.NumberFilter()
    stage = django_filters.NumberFilter()
    owner = django_filters.NumberFilter()
    status = django_filters.ChoiceFilter(choices=SalesLead.STATUS_CHOICES)
    
    # 고객 필터
    company = django_filters.NumberFilter()
    
    # 검색
    q = django_filters.CharFilter(method='search_filter')
    
    # 금액 범위
    amount_min = django_filters.NumberFilter(
        field_name='expected_amount', lookup_expr='gte'
    )
    amount_max = django_filters.NumberFilter(
        field_name='expected_amount', lookup_expr='lte'
    )
    
    # 날짜 범위
    close_date_from = django_filters.DateFilter(
        field_name='expected_close_date', lookup_expr='gte'
    )
    close_date_to = django_filters.DateFilter(
        field_name='expected_close_date', lookup_expr='lte'
    )
    created_from = django_filters.DateFilter(
        field_name='created_at', lookup_expr='gte'
    )
    created_to = django_filters.DateFilter(
        field_name='created_at', lookup_expr='lte'
    )
    
    # 지연 필터 (7일 이상 단계에 머무름)
    stalled = django_filters.BooleanFilter(method='stalled_filter')
    
    # 다음 액션 예정일 기준
    action_due_before = django_filters.DateFilter(
        field_name='next_action_due_at', lookup_expr='lte'
    )
    
    class Meta:
        model = SalesLead
        fields = [
            'pipeline', 'stage', 'owner', 'status', 'company',
            'q', 'amount_min', 'amount_max',
            'close_date_from', 'close_date_to',
            'created_from', 'created_to',
            'stalled', 'action_due_before'
        ]
    
    def search_filter(self, queryset, name, value):
        """제목, 설명, 고객사명, 담당자명 검색"""
        return queryset.filter(
            models.Q(title__icontains=value) |
            models.Q(description__icontains=value) |
            models.Q(company__name__icontains=value) |
            models.Q(contact__name__icontains=value)
        )
    
    def stalled_filter(self, queryset, name, value):
        """7일 이상 단계에 머문 리드"""
        if value:
            threshold = timezone.now() - timedelta(days=7)
            return queryset.filter(
                stage_entered_at__lte=threshold,
                status='active'
            )
        return queryset


# django_filters가 없는 경우를 위한 import 보완
from django.db import models


class LeadTaskFilter(django_filters.FilterSet):
    """할 일 필터"""
    lead = django_filters.NumberFilter()
    assignee = django_filters.NumberFilter()
    is_completed = django_filters.BooleanFilter()
    priority = django_filters.ChoiceFilter(choices=LeadTask.PRIORITY_CHOICES)
    
    # 기한 필터
    due_from = django_filters.DateTimeFilter(
        field_name='due_date', lookup_expr='gte'
    )
    due_to = django_filters.DateTimeFilter(
        field_name='due_date', lookup_expr='lte'
    )
    
    # 오늘 마감
    today = django_filters.BooleanFilter(method='today_filter')
    # 연체
    overdue = django_filters.BooleanFilter(method='overdue_filter')
    
    class Meta:
        model = LeadTask
        fields = [
            'lead', 'assignee', 'is_completed', 'priority',
            'due_from', 'due_to', 'today', 'overdue'
        ]
    
    def today_filter(self, queryset, name, value):
        if value:
            today = timezone.now().date()
            return queryset.filter(
                due_date__date=today,
                is_completed=False
            )
        return queryset
    
    def overdue_filter(self, queryset, name, value):
        if value:
            return queryset.filter(
                due_date__lt=timezone.now(),
                is_completed=False
            )
        return queryset


class QuoteFilter(django_filters.FilterSet):
    """견적서 필터"""
    lead = django_filters.NumberFilter()
    company = django_filters.NumberFilter()
    status = django_filters.ChoiceFilter(choices=Quote.STATUS_CHOICES)
    
    created_from = django_filters.DateFilter(
        field_name='created_at', lookup_expr='gte'
    )
    created_to = django_filters.DateFilter(
        field_name='created_at', lookup_expr='lte'
    )
    
    class Meta:
        model = Quote
        fields = ['lead', 'company', 'status', 'created_from', 'created_to']
