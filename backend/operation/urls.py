# backend/operation/urls.py
"""
영업관리(Operation) 모듈 - URL 라우팅
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()

# 고객 관리
router.register(r'customers/companies', views.CustomerCompanyViewSet, basename='customer-company')
router.register(r'customers/contacts', views.CustomerContactViewSet, basename='customer-contact')

# 파이프라인 / 단계
router.register(r'pipelines', views.SalesPipelineViewSet, basename='pipeline')
router.register(r'stages', views.SalesStageViewSet, basename='stage')

# 영업기회
router.register(r'leads', views.SalesLeadViewSet, basename='lead')

# 활동 / 할일 / 파일
router.register(r'activities', views.LeadActivityViewSet, basename='activity')
router.register(r'tasks', views.LeadTaskViewSet, basename='task')
router.register(r'files', views.LeadFileViewSet, basename='file')

# 견적서
router.register(r'quotes', views.QuoteViewSet, basename='quote')
router.register(r'quote-templates', views.QuoteTemplateViewSet, basename='quote-template')

urlpatterns = [
    # ViewSet 라우터
    path('', include(router.urls)),
    
    # 기타 API 뷰
    path('calendar/', views.CalendarFeedView.as_view(), name='calendar-feed'),
    path('inbox/', views.InboxView.as_view(), name='inbox'),
    path('dashboard/', views.SalesDashboardView.as_view(), name='sales-dashboard'),
]
