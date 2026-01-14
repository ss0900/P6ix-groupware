// src/api/operation/tenders.js
/**
 * 영업관리 - 입찰 API
 */
import api from "../axios";

const TenderService = {
  getTenders: async (params = {}) => {
    const response = await api.get("/operation/tenders/", { params });
    return response.data;
  },

  getTender: async (id) => {
    const response = await api.get(`/operation/tenders/${id}/`);
    return response.data;
  },

  createTender: async (data) => {
    const response = await api.post("/operation/tenders/", data);
    return response.data;
  },

  updateTender: async (id, data) => {
    const response = await api.patch(`/operation/tenders/${id}/`, data);
    return response.data;
  },

  deleteTender: async (id) => {
    await api.delete(`/operation/tenders/${id}/`);
  },
};

export default TenderService;
