// src/api/salesApi.js
// 영업관리 모듈 API 서비스
import api from "./axios";

const BASE_URL = "operation";

// =========================================
// 파이프라인 (Pipelines)
// =========================================
export const pipelineApi = {
  // 목록 조회
  getList: (params = {}) => api.get(`${BASE_URL}/pipelines/`, { params }),
  
  // 상세 조회 (단계 포함)
  getDetail: (id) => api.get(`${BASE_URL}/pipelines/${id}/`),
  
  // 생성
  create: (data) => api.post(`${BASE_URL}/pipelines/`, data),
  
  // 수정
  update: (id, data) => api.patch(`${BASE_URL}/pipelines/${id}/`, data),
  
  // 삭제
  delete: (id) => api.delete(`${BASE_URL}/pipelines/${id}/`),
  
  // 기본 파이프라인 설정
  setDefault: (id) => api.post(`${BASE_URL}/pipelines/${id}/set_default/`),
};

// =========================================
// 단계 (Stages)
// =========================================
export const stageApi = {
  // 목록 조회 (파이프라인별)
  getList: (params = {}) => api.get(`${BASE_URL}/stages/`, { params }),
  
  // 상세 조회
  getDetail: (id) => api.get(`${BASE_URL}/stages/${id}/`),
  
  // 생성
  create: (data) => api.post(`${BASE_URL}/stages/`, data),
  
  // 수정
  update: (id, data) => api.patch(`${BASE_URL}/stages/${id}/`, data),
  
  // 삭제
  delete: (id) => api.delete(`${BASE_URL}/stages/${id}/`),
  
  // 순서 변경
  reorder: (orders) => api.post(`${BASE_URL}/stages/reorder/`, { orders }),
};

// =========================================
// 고객 담당자 (Contacts)
// =========================================
export const contactApi = {
  // 목록 조회
  getList: (params = {}) => api.get(`${BASE_URL}/contacts/`, { params }),
  
  // 상세 조회
  getDetail: (id) => api.get(`${BASE_URL}/contacts/${id}/`),
  
  // 생성
  create: (data) => api.post(`${BASE_URL}/contacts/`, data),
  
  // 수정
  update: (id, data) => api.patch(`${BASE_URL}/contacts/${id}/`, data),
  
  // 삭제
  delete: (id) => api.delete(`${BASE_URL}/contacts/${id}/`),
};

// =========================================
// 거래처 (Clients)
// =========================================
export const clientApi = {
  // 목록 조회
  getList: (params = {}) => api.get(`${BASE_URL}/clients/`, { params }),
  
  // 계층 구조 조회
  getHierarchy: () => api.get(`${BASE_URL}/clients/`, { params: { hierarchy: "true" } }),
  
  // 상세 조회
  getDetail: (id) => api.get(`${BASE_URL}/clients/${id}/`),
  
  // 생성
  create: (data) => api.post(`${BASE_URL}/clients/`, data),
  
  // 수정
  update: (id, data) => api.patch(`${BASE_URL}/clients/${id}/`, data),
  
  // 삭제
  delete: (id) => api.delete(`${BASE_URL}/clients/${id}/`),
  
  // 집계 데이터 (하위 부서 포함)
  getAggregation: (id) => api.get(`${BASE_URL}/clients/${id}/aggregation/`),
};

// =========================================
// 영업 기회 (Opportunities)
// =========================================
export const opportunityApi = {
  // 목록 조회
  getList: (params = {}) => api.get(`${BASE_URL}/opportunities/`, { params }),
  
  // 상세 조회
  getDetail: (id) => api.get(`${BASE_URL}/opportunities/${id}/`),
  
  // 생성
  create: (data) => api.post(`${BASE_URL}/opportunities/`, data),
  
  // 수정
  update: (id, data) => api.patch(`${BASE_URL}/opportunities/${id}/`, data),
  
  // 삭제
  delete: (id) => api.delete(`${BASE_URL}/opportunities/${id}/`),
  
  // 통계
  getStats: (params = {}) => api.get(`${BASE_URL}/opportunities/stats/`, { params }),
  
  // 트렌드 분석
  getTrend: (params = {}) => api.get(`${BASE_URL}/opportunities/trend/`, { params }),
  
  // 칸반 보드 데이터
  getKanban: (pipelineId = null) => {
    const params = pipelineId ? { pipeline: pipelineId } : {};
    return api.get(`${BASE_URL}/opportunities/kanban/`, { params });
  },
  
  // 단계 이동 (칸반 DnD)
  moveStage: (id, stageId) => api.post(`${BASE_URL}/opportunities/${id}/move_stage/`, { stage_id: stageId }),
  
  // 활동 목록
  getActivities: (id) => api.get(`${BASE_URL}/opportunities/${id}/activities/`),
  
  // 활동 추가
  addActivity: (id, data) => api.post(`${BASE_URL}/opportunities/${id}/activities/`, data),
  
  // 태스크 목록
  getTasks: (id) => api.get(`${BASE_URL}/opportunities/${id}/tasks/`),
  
  // 태스크 추가
  addTask: (id, data) => api.post(`${BASE_URL}/opportunities/${id}/tasks/`, data),
  
  // 태스크 완료
  completeTask: (id, taskId) => api.post(`${BASE_URL}/opportunities/${id}/tasks/${taskId}/complete/`),
  
  // 파일 목록
  getFiles: (id) => api.get(`${BASE_URL}/opportunities/${id}/files/`),
  
  // 파일 업로드
  uploadFile: (id, file) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post(`${BASE_URL}/opportunities/${id}/files/`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};

// =========================================
// 견적 템플릿 (Quote Templates)
// =========================================
export const quoteTemplateApi = {
  // 목록 조회
  getList: () => api.get(`${BASE_URL}/quote-templates/`),
  
  // 기본 템플릿 조회
  getDefault: () => api.get(`${BASE_URL}/quote-templates/default/`),
  
  // 상세 조회
  getDetail: (id) => api.get(`${BASE_URL}/quote-templates/${id}/`),
  
  // 생성
  create: (data) => api.post(`${BASE_URL}/quote-templates/`, data),
  
  // 수정
  update: (id, data) => api.patch(`${BASE_URL}/quote-templates/${id}/`, data),
  
  // 삭제
  delete: (id) => api.delete(`${BASE_URL}/quote-templates/${id}/`),
};

// =========================================
// 견적 (Estimates)
// =========================================
export const estimateApi = {
  // 목록 조회
  getList: (params = {}) => api.get(`${BASE_URL}/estimates/`, { params }),
  
  // 상세 조회
  getDetail: (id) => api.get(`${BASE_URL}/estimates/${id}/`),
  
  // 생성
  create: (data) => api.post(`${BASE_URL}/estimates/`, data),
  
  // 수정
  update: (id, data) => api.patch(`${BASE_URL}/estimates/${id}/`, data),
  
  // 삭제
  delete: (id) => api.delete(`${BASE_URL}/estimates/${id}/`),
  
  // 항목 추가
  addItem: (id, itemData) => api.post(`${BASE_URL}/estimates/${id}/add_item/`, itemData),
  
  // 새 버전 생성
  createVersion: (id) => api.post(`${BASE_URL}/estimates/${id}/create_version/`),
  
  // 최종 승인본 설정
  setFinal: (id) => api.post(`${BASE_URL}/estimates/${id}/set_final/`),
  
  // 버전 히스토리
  getVersions: (id) => api.get(`${BASE_URL}/estimates/${id}/versions/`),
};

// =========================================
// 계약 (Contracts)
// =========================================
export const contractApi = {
  // 목록 조회
  getList: (params = {}) => api.get(`${BASE_URL}/contracts/`, { params }),
  
  // 상세 조회
  getDetail: (id) => api.get(`${BASE_URL}/contracts/${id}/`),
  
  // 생성
  create: (data) => api.post(`${BASE_URL}/contracts/`, data),
  
  // 수정
  update: (id, data) => api.patch(`${BASE_URL}/contracts/${id}/`, data),
  
  // 삭제
  delete: (id) => api.delete(`${BASE_URL}/contracts/${id}/`),
  
  // 청구 스케줄 자동 생성
  generateBillingSchedule: (id) => api.post(`${BASE_URL}/contracts/${id}/generate_billing_schedule/`),
};

// =========================================
// 청구 스케줄 (Billing Schedules)
// =========================================
export const billingScheduleApi = {
  // 목록 조회
  getList: (params = {}) => api.get(`${BASE_URL}/billing-schedules/`, { params }),
  
  // 상세 조회
  getDetail: (id) => api.get(`${BASE_URL}/billing-schedules/${id}/`),
  
  // 생성
  create: (data) => api.post(`${BASE_URL}/billing-schedules/`, data),
  
  // 수정
  update: (id, data) => api.patch(`${BASE_URL}/billing-schedules/${id}/`, data),
  
  // 삭제
  delete: (id) => api.delete(`${BASE_URL}/billing-schedules/${id}/`),
  
  // 청구서 생성
  createInvoice: (id) => api.post(`${BASE_URL}/billing-schedules/${id}/create_invoice/`),
};

// =========================================
// 청구서 (Invoices)
// =========================================
export const invoiceApi = {
  // 목록 조회
  getList: (params = {}) => api.get(`${BASE_URL}/invoices/`, { params }),
  
  // 상세 조회
  getDetail: (id) => api.get(`${BASE_URL}/invoices/${id}/`),
  
  // 생성
  create: (data) => api.post(`${BASE_URL}/invoices/`, data),
  
  // 수정
  update: (id, data) => api.patch(`${BASE_URL}/invoices/${id}/`, data),
  
  // 삭제
  delete: (id) => api.delete(`${BASE_URL}/invoices/${id}/`),
  
  // 미수금 현황
  getReceivableSummary: () => api.get(`${BASE_URL}/invoices/receivable_summary/`),
};

// =========================================
// 수금 기록 (Payments)
// =========================================
export const paymentApi = {
  // 목록 조회
  getList: (params = {}) => api.get(`${BASE_URL}/payments/`, { params }),
  
  // 상세 조회
  getDetail: (id) => api.get(`${BASE_URL}/payments/${id}/`),
  
  // 생성
  create: (data) => api.post(`${BASE_URL}/payments/`, data),
  
  // 수정
  update: (id, data) => api.patch(`${BASE_URL}/payments/${id}/`, data),
  
  // 삭제
  delete: (id) => api.delete(`${BASE_URL}/payments/${id}/`),
};

// =========================================
// 대시보드 (Dashboard)
// =========================================
export const dashboardApi = {
  // 요약 데이터
  getSummary: () => api.get(`${BASE_URL}/dashboard/summary/`),
};

// =========================================
// 캘린더 (Calendar)
// =========================================
export const calendarApi = {
  // 이벤트 조회
  getEvents: (params = {}) => api.get(`${BASE_URL}/calendar/`, { params }),
};

// 기본 export
export default {
  pipeline: pipelineApi,
  stage: stageApi,
  contact: contactApi,
  client: clientApi,
  opportunity: opportunityApi,
  quoteTemplate: quoteTemplateApi,
  estimate: estimateApi,
  contract: contractApi,
  billingSchedule: billingScheduleApi,
  invoice: invoiceApi,
  payment: paymentApi,
  dashboard: dashboardApi,
  calendar: calendarApi,
};
