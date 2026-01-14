// src/api/operation/revenue.js
/**
 * 영업관리 - 매출/수금 API
 */
import api from "../axios";

const RevenueService = {
  // 매출 계획
  getMilestones: async (params = {}) => {
    const response = await api.get("/operation/revenue-milestones/", { params });
    return response.data;
  },

  getMilestone: async (id) => {
    const response = await api.get(`/operation/revenue-milestones/${id}/`);
    return response.data;
  },

  createMilestone: async (data) => {
    const response = await api.post("/operation/revenue-milestones/", data);
    return response.data;
  },

  updateMilestone: async (id, data) => {
    const response = await api.patch(`/operation/revenue-milestones/${id}/`, data);
    return response.data;
  },

  deleteMilestone: async (id) => {
    await api.delete(`/operation/revenue-milestones/${id}/`);
  },

  // 수금
  getCollections: async (params = {}) => {
    const response = await api.get("/operation/collections/", { params });
    return response.data;
  },

  getCollection: async (id) => {
    const response = await api.get(`/operation/collections/${id}/`);
    return response.data;
  },

  createCollection: async (data) => {
    const response = await api.post("/operation/collections/", data);
    return response.data;
  },

  updateCollection: async (id, data) => {
    const response = await api.patch(`/operation/collections/${id}/`, data);
    return response.data;
  },

  deleteCollection: async (id) => {
    await api.delete(`/operation/collections/${id}/`);
  },

  // 요약
  getSummary: async () => {
    const response = await api.get("/operation/revenue/summary/");
    return response.data;
  },
};

export default RevenueService;
