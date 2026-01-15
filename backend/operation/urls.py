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
router.register(r'quotes', views.QuoteViewSet, basename='quote')

# 견적서
router.register(r'quote-templates', views.QuoteTemplateViewSet, basename='quote-template')

# 계약/입찰/매출/수금
router.register(r'contract-links', views.SalesContractLinkViewSet, basename='contract-link')
router.register(r'tenders', views.TenderViewSet, basename='tender')
router.register(r'revenue-milestones', views.RevenueMilestoneViewSet, basename='revenue-milestone')
router.register(r'collections', views.CollectionViewSet, basename='collection')
router.register(r'email-templates', views.EmailTemplateViewSet, basename='email-template')

# 이메일
router.register(r'email-signatures', views.EmailSignatureViewSet, basename='email-signature')
router.register(r'email-logs', views.EmailSendLogViewSet, basename='email-log')

urlpatterns = [
    # ViewSet 라우터
    path('', include(router.urls)),
    
    # 기타 API 뷰
    path('calendar/', views.CalendarFeedView.as_view(), name='calendar-feed'),
    path('inbox/', views.InboxView.as_view(), name='inbox'),
    path('dashboard/', views.SalesDashboardView.as_view(), name='sales-dashboard'),
    path('revenue/summary/', views.RevenueSummaryView.as_view(), name='revenue-summary'),
]
