// src/api/project.js
// 프로젝트 관리 모듈 API 서비스
import api from "./axios";

const BASE_URL = "/project";

// ========================
// 프로젝트 (Projects)
// ========================

/**
 * 프로젝트 목록 조회
 * @param {Object} params - 필터 파라미터
 * @param {string} params.status - 상태 필터 (preparing, in_progress, completed, on_hold)
 * @param {boolean} params.is_public - 공개 여부
 * @param {boolean} params.is_important - 중요 표시
 * @param {boolean} params.my_projects - 내 소속 프로젝트만
 * @param {string} params.search - 검색어
 * @param {string} params.ordering - 정렬 (-updated_at, -created_at, name 등)
 */
export const getProjects = async (params = {}) => {
  const response = await api.get(`${BASE_URL}/projects/`, { params });
  return response.data;
};

/**
 * 프로젝트 상세 조회
 * @param {number} id - 프로젝트 ID
 */
export const getProject = async (id) => {
  const response = await api.get(`${BASE_URL}/projects/${id}/`);
  return response.data;
};

/**
 * 프로젝트 생성
 * @param {Object} data - 프로젝트 데이터
 */
export const createProject = async (data) => {
  const response = await api.post(`${BASE_URL}/projects/`, data);
  return response.data;
};

/**
 * 프로젝트 수정
 * @param {number} id - 프로젝트 ID
 * @param {Object} data - 수정할 데이터
 */
export const updateProject = async (id, data) => {
  const response = await api.patch(`${BASE_URL}/projects/${id}/`, data);
  return response.data;
};

/**
 * 프로젝트 삭제
 * @param {number} id - 프로젝트 ID
 */
export const deleteProject = async (id) => {
  await api.delete(`${BASE_URL}/projects/${id}/`);
};

// ========================
// 프로젝트 멤버 (Members)
// ========================

/**
 * 프로젝트 멤버 목록 조회
 * @param {number} projectId - 프로젝트 ID
 */
export const getProjectMembers = async (projectId) => {
  const response = await api.get(`${BASE_URL}/projects/${projectId}/members/`);
  return response.data;
};

/**
 * 프로젝트 멤버 추가
 * @param {number} projectId - 프로젝트 ID
 * @param {number} userId - 사용자 ID
 * @param {string} role - 역할 (admin, member, viewer)
 */
export const addProjectMember = async (projectId, userId, role = "member") => {
  const response = await api.post(`${BASE_URL}/projects/${projectId}/members/`, {
    user_id: userId,
    role,
  });
  return response.data;
};

/**
 * 프로젝트 멤버 제거
 * @param {number} projectId - 프로젝트 ID
 * @param {number} userId - 사용자 ID
 */
export const removeProjectMember = async (projectId, userId) => {
  await api.delete(`${BASE_URL}/projects/${projectId}/members/`, {
    data: { user_id: userId },
  });
};

/**
 * 프로젝트 활동 로그 조회
 * @param {number} projectId - 프로젝트 ID
 */
export const getProjectActivities = async (projectId) => {
  const response = await api.get(`${BASE_URL}/projects/${projectId}/activities/`);
  return response.data;
};

// ========================
// 업무 (Tasks)
// ========================

/**
 * 업무 목록 조회
 * @param {Object} params - 필터 파라미터
 * @param {number|string} params.project_id - 프로젝트 ID ('null' or 'unassigned' for 미분류)
 * @param {string} params.status - 상태 필터
 * @param {string} params.priority - 우선순위 필터
 * @param {string} params.assignee - 담당자 ('me' for 현재 사용자)
 * @param {boolean} params.include_disabled - 사용중지 포함 여부
 * @param {boolean} params.is_read - 읽음 여부
 * @param {string} params.search - 검색어
 * @param {string} params.ordering - 정렬
 */
export const getTasks = async (params = {}) => {
  const response = await api.get(`${BASE_URL}/tasks/`, { params });
  return response.data;
};

/**
 * 업무 상세 조회
 * @param {number} id - 업무 ID
 */
export const getTask = async (id) => {
  const response = await api.get(`${BASE_URL}/tasks/${id}/`);
  return response.data;
};

/**
 * 업무 생성
 * @param {Object|FormData} data - 업무 데이터 (파일 포함 시 FormData)
 */
export const createTask = async (data) => {
  const isFormData = data instanceof FormData;
  const response = await api.post(`${BASE_URL}/tasks/`, data, {
    headers: isFormData ? { "Content-Type": "multipart/form-data" } : {},
  });
  return response.data;
};

/**
 * 업무 수정
 * @param {number} id - 업무 ID
 * @param {Object|FormData} data - 수정할 데이터
 */
export const updateTask = async (id, data) => {
  const isFormData = data instanceof FormData;
  const response = await api.patch(`${BASE_URL}/tasks/${id}/`, data, {
    headers: isFormData ? { "Content-Type": "multipart/form-data" } : {},
  });
  return response.data;
};

/**
 * 업무 삭제
 * @param {number} id - 업무 ID
 */
export const deleteTask = async (id) => {
  await api.delete(`${BASE_URL}/tasks/${id}/`);
};

/**
 * 업무 일괄 처리
 * @param {number[]} taskIds - 업무 ID 배열
 * @param {string} action - 작업 유형 (read, unread, disable, enable, delete)
 */
export const bulkUpdateTasks = async (taskIds, action) => {
  const response = await api.post(`${BASE_URL}/tasks/bulk/`, {
    task_ids: taskIds,
    action,
  });
  return response.data;
};

// ========================
// 첨부파일 (Attachments)
// ========================

/**
 * 업무 첨부파일 목록 조회
 * @param {number} taskId - 업무 ID
 */
export const getTaskAttachments = async (taskId) => {
  const response = await api.get(`${BASE_URL}/tasks/${taskId}/attachments/`);
  return response.data;
};

/**
 * 업무 첨부파일 업로드
 * @param {number} taskId - 업무 ID
 * @param {File[]} files - 파일 배열
 */
export const uploadTaskAttachments = async (taskId, files) => {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append("files", file);
  });
  const response = await api.post(`${BASE_URL}/tasks/${taskId}/attachments/`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

/**
 * 첨부파일 삭제
 * @param {number} attachmentId - 첨부파일 ID
 */
export const deleteAttachment = async (attachmentId) => {
  await api.delete(`${BASE_URL}/attachments/${attachmentId}/`);
};

// ========================
// 댓글 (Comments)
// ========================

/**
 * 업무 댓글 목록 조회
 * @param {number} taskId - 업무 ID
 */
export const getTaskComments = async (taskId) => {
  const response = await api.get(`${BASE_URL}/comments/`, {
    params: { task_id: taskId },
  });
  return response.data;
};

/**
 * 댓글 작성
 * @param {number} taskId - 업무 ID
 * @param {string} content - 댓글 내용
 */
export const createComment = async (taskId, content) => {
  const response = await api.post(`${BASE_URL}/comments/`, {
    task: taskId,
    content,
  });
  return response.data;
};

/**
 * 댓글 수정
 * @param {number} commentId - 댓글 ID
 * @param {string} content - 수정할 내용
 */
export const updateComment = async (commentId, content) => {
  const response = await api.patch(`${BASE_URL}/comments/${commentId}/`, {
    content,
  });
  return response.data;
};

/**
 * 댓글 삭제
 * @param {number} commentId - 댓글 ID
 */
export const deleteComment = async (commentId) => {
  await api.delete(`${BASE_URL}/comments/${commentId}/`);
};

// ========================
// 활동 로그 (Activity Logs)
// ========================

/**
 * 활동 로그 목록 조회
 * @param {Object} params - 필터 파라미터
 * @param {number} params.project_id - 프로젝트 ID
 * @param {number} params.task_id - 업무 ID
 */
export const getActivityLogs = async (params = {}) => {
  const response = await api.get(`${BASE_URL}/activities/`, { params });
  return response.data;
};

// ========================
// 타임시트 (Timesheet)
// ========================

/**
 * 타임시트 목록 조회
 * @param {Object} params - 필터 파라미터
 * @param {number} params.user_id - 사용자 ID (생략시 현재 사용자)
 * @param {string} params.start_date - 시작일 (YYYY-MM-DD)
 * @param {string} params.end_date - 종료일 (YYYY-MM-DD)
 * @param {number} params.project_id - 프로젝트 ID
 */
export const getTimesheets = async (params = {}) => {
  const response = await api.get(`${BASE_URL}/timesheets/`, { params });
  return response.data;
};

/**
 * 타임시트 upsert (날짜+프로젝트+업무 기준 생성/수정)
 * @param {Object} data - 타임시트 데이터
 * @param {string} data.work_date - 작업일
 * @param {number} data.project - 프로젝트 ID
 * @param {number} data.task - 업무 ID
 * @param {number} data.hours - 시간
 * @param {string} data.memo - 메모
 */
export const upsertTimesheet = async (data) => {
  const response = await api.post(`${BASE_URL}/timesheets/upsert/`, data);
  return response.data;
};

/**
 * 타임시트 삭제
 * @param {number} id - 타임시트 ID
 */
export const deleteTimesheet = async (id) => {
  await api.delete(`${BASE_URL}/timesheets/${id}/`);
};

/**
 * 타임시트 집계 조회
 * @param {Object} params - 필터 파라미터
 * @param {number} params.user_id - 사용자 ID
 * @param {string} params.start_date - 시작일
 * @param {string} params.end_date - 종료일
 * @param {string} params.group_by - 집계 유형 (project, month, total)
 */
export const getTimesheetSummary = async (params = {}) => {
  const response = await api.get(`${BASE_URL}/timesheets/summary/`, { params });
  return response.data;
};

// ========================
// 업무일지 (Work Diary)
// ========================

/**
 * 업무일지 목록 조회
 * @param {Object} params - 필터 파라미터
 * @param {number} params.user_id - 사용자 ID (생략시 현재 사용자)
 * @param {string} params.start_date - 시작일 (YYYY-MM-DD)
 * @param {string} params.end_date - 종료일 (YYYY-MM-DD)
 * @param {string} params.date - 특정 날짜
 * @param {number} params.project_id - 프로젝트 ID
 */
export const getDiaries = async (params = {}) => {
  const response = await api.get(`${BASE_URL}/diaries/`, { params });
  return response.data;
};

/**
 * 업무일지 생성
 * @param {Object} data - 업무일지 데이터
 */
export const createDiary = async (data) => {
  const response = await api.post(`${BASE_URL}/diaries/`, data);
  return response.data;
};

/**
 * 업무일지 수정
 * @param {number} id - 업무일지 ID
 * @param {Object} data - 수정할 데이터
 */
export const updateDiary = async (id, data) => {
  const response = await api.patch(`${BASE_URL}/diaries/${id}/`, data);
  return response.data;
};

/**
 * 업무일지 삭제
 * @param {number} id - 업무일지 ID
 */
export const deleteDiary = async (id) => {
  await api.delete(`${BASE_URL}/diaries/${id}/`);
};

/**
 * 특정 날짜 업무일지 일괄 저장
 * @param {string} date - 날짜 (YYYY-MM-DD)
 * @param {Array} entries - 업무일지 배열 [{project, task, content}, ...]
 */
export const saveDayDiaries = async (date, entries) => {
  const response = await api.post(`${BASE_URL}/diaries/save-day/`, {
    date,
    entries,
  });
  return response.data;
};

// ========================
// 주간 보고 (Weekly Reports)
// ========================

/**
 * 주간 업무 집계 조회 (사람별)
 * @param {Object} params
 * @param {string} params.week_start - 조회 주간 시작일 (YYYY-MM-DD)
 * @param {number} params.project_id - 프로젝트 필터 (선택)
 * @param {number} params.user_id - 사용자 필터 (선택)
 */
export const getWeeklyReport = async (params = {}) => {
  const response = await api.get(`${BASE_URL}/reports/weekly/`, { params });
  return response.data;
};

/**
 * 영업관리 주간 집계 조회 (관리자 전용)
 * @param {Object} params
 * @param {string} params.week_start - 조회 주간 시작일
 */
export const getSalesWeeklyReport = async (params = {}) => {
  const response = await api.get(`${BASE_URL}/reports/sales-weekly/`, { params });
  return response.data;
};

// 기본 export
const ProjectService = {
  // 프로젝트
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  // 멤버
  getProjectMembers,
  addProjectMember,
  removeProjectMember,
  getProjectActivities,
  // 업무
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  bulkUpdateTasks,
  // 첨부파일
  getTaskAttachments,
  uploadTaskAttachments,
  deleteAttachment,
  // 댓글
  getTaskComments,
  createComment,
  updateComment,
  deleteComment,
  // 활동 로그
  getActivityLogs,
  // 타임시트
  getTimesheets,
  upsertTimesheet,
  deleteTimesheet,
  getTimesheetSummary,
  // 업무일지
  getDiaries,
  createDiary,
  updateDiary,
  deleteDiary,
  saveDayDiaries,
  // 주간 보고
  getWeeklyReport,
  getSalesWeeklyReport,
};

export default ProjectService;
