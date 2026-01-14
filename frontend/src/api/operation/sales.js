// src/api/operation/sales.js
/**
 * 영업관리 - 영업기회/파이프라인/단계/활동/할일/파일 API
 */
import api from "../axios";

const SalesService = {
  // ============================================================
  // 파이프라인
  // ============================================================
  getPipelines: async () => {
    const response = await api.get("/operation/pipelines/");
    return response.data.results || response.data;
  },

  getPipeline: async (id) => {
    const response = await api.get(`/operation/pipelines/${id}/`);
    return response.data;
  },

  getPipelineLeads: async (id) => {
    // 칸반용 - 단계별로 그룹화된 리드
    const response = await api.get(`/operation/pipelines/${id}/leads/`);
    return response.data;
  },

  createPipeline: async (data) => {
    const response = await api.post("/operation/pipelines/", data);
    return response.data;
  },

  updatePipeline: async (id, data) => {
    const response = await api.patch(`/operation/pipelines/${id}/`, data);
    return response.data;
  },

  deletePipeline: async (id) => {
    await api.delete(`/operation/pipelines/${id}/`);
  },

  // ============================================================
  // 단계
  // ============================================================
  getStages: async (pipelineId) => {
    const params = pipelineId ? { pipeline: pipelineId } : {};
    const response = await api.get("/operation/stages/", { params });
    return response.data.results || response.data;
  },

  createStage: async (data) => {
    const response = await api.post("/operation/stages/", data);
    return response.data;
  },

  updateStage: async (id, data) => {
    const response = await api.patch(`/operation/stages/${id}/`, data);
    return response.data;
  },

  deleteStage: async (id) => {
    await api.delete(`/operation/stages/${id}/`);
  },

  // ============================================================
  // 영업기회 (Leads)
  // ============================================================
  getLeads: async (params = {}) => {
    const response = await api.get("/operation/leads/", { params });
    return response.data;
  },

  getLead: async (id) => {
    const response = await api.get(`/operation/leads/${id}/`);
    return response.data;
  },

  createLead: async (data) => {
    const response = await api.post("/operation/leads/", data);
    return response.data;
  },

  updateLead: async (id, data) => {
    const response = await api.patch(`/operation/leads/${id}/`, data);
    return response.data;
  },

  deleteLead: async (id) => {
    await api.delete(`/operation/leads/${id}/`);
  },

  // 단계 이동 (칸반 DnD)
  moveStage: async (leadId, stageId, note = "") => {
    const response = await api.post(`/operation/leads/${leadId}/move_stage/`, {
      stage_id: stageId,
      note,
    });
    return response.data;
  },

  // ============================================================
  // 활동 로그
  // ============================================================
  getActivities: async (leadId) => {
    const response = await api.get(`/operation/leads/${leadId}/activities/`);
    return response.data;
  },

  createActivity: async (leadId, data) => {
    const response = await api.post(`/operation/leads/${leadId}/activities/`, data);
    return response.data;
  },

  // ============================================================
  // 할 일 (Tasks)
  // ============================================================
  getTasks: async (params = {}) => {
    const response = await api.get("/operation/tasks/", { params });
    return response.data.results || response.data;
  },

  getLeadTasks: async (leadId) => {
    const response = await api.get(`/operation/leads/${leadId}/tasks/`);
    return response.data;
  },

  createTask: async (leadId, data) => {
    const response = await api.post(`/operation/leads/${leadId}/tasks/`, data);
    return response.data;
  },

  updateTask: async (taskId, data) => {
    const response = await api.patch(`/operation/tasks/${taskId}/`, data);
    return response.data;
  },

  deleteTask: async (taskId) => {
    await api.delete(`/operation/tasks/${taskId}/`);
  },

  completeTask: async (taskId) => {
    const response = await api.post(`/operation/tasks/${taskId}/complete/`);
    return response.data;
  },

  uncompleteTask: async (taskId) => {
    const response = await api.post(`/operation/tasks/${taskId}/uncomplete/`);
    return response.data;
  },

  // ============================================================
  // 파일
  // ============================================================
  getFiles: async (leadId) => {
    const response = await api.get(`/operation/leads/${leadId}/files/`);
    return response.data;
  },

  uploadFile: async (leadId, file) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post(`/operation/leads/${leadId}/files/`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  deleteFile: async (fileId) => {
    await api.delete(`/operation/files/${fileId}/`);
  },

  // ============================================================
  // 기타
  // ============================================================
  getInbox: async () => {
    const response = await api.get("/operation/inbox/");
    return response.data;
  },

  getCalendar: async (start, end) => {
    const params = {};
    if (start) params.start = start;
    if (end) params.end = end;
    const response = await api.get("/operation/calendar/", { params });
    return response.data;
  },

  getDashboard: async () => {
    const response = await api.get("/operation/dashboard/");
    return response.data;
  },
};

export default SalesService;
