// src/api/operation/contracts.js
/**
 * 영업관리 - 계약 연결 API
 */
import api from "../axios";

const ContractLinkService = {
  getLinks: async (params = {}) => {
    const response = await api.get("/operation/contract-links/", { params });
    return response.data;
  },

  getLink: async (id) => {
    const response = await api.get(`/operation/contract-links/${id}/`);
    return response.data;
  },

  createLink: async (data) => {
    const response = await api.post("/operation/contract-links/", data);
    return response.data;
  },

  updateLink: async (id, data) => {
    const response = await api.patch(`/operation/contract-links/${id}/`, data);
    return response.data;
  },

  deleteLink: async (id) => {
    await api.delete(`/operation/contract-links/${id}/`);
  },
};

export default ContractLinkService;
