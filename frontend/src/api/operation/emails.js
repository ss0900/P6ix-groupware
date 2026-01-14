// src/api/operation/emails.js
/**
 * 영업관리 - 이메일 템플릿/서명/로그 API
 */
import api from "../axios";

const EmailService = {
  // templates
  getTemplates: async (params = {}) => {
    const response = await api.get("/operation/email-templates/", { params });
    return response.data;
  },

  getTemplate: async (id) => {
    const response = await api.get(`/operation/email-templates/${id}/`);
    return response.data;
  },

  createTemplate: async (data) => {
    const response = await api.post("/operation/email-templates/", data);
    return response.data;
  },

  updateTemplate: async (id, data) => {
    const response = await api.patch(`/operation/email-templates/${id}/`, data);
    return response.data;
  },

  deleteTemplate: async (id) => {
    await api.delete(`/operation/email-templates/${id}/`);
  },

  // signatures
  getSignatures: async (params = {}) => {
    const response = await api.get("/operation/email-signatures/", { params });
    return response.data;
  },

  getSignature: async (id) => {
    const response = await api.get(`/operation/email-signatures/${id}/`);
    return response.data;
  },

  createSignature: async (data) => {
    const response = await api.post("/operation/email-signatures/", data);
    return response.data;
  },

  updateSignature: async (id, data) => {
    const response = await api.patch(`/operation/email-signatures/${id}/`, data);
    return response.data;
  },

  deleteSignature: async (id) => {
    await api.delete(`/operation/email-signatures/${id}/`);
  },

  // logs
  getLogs: async (params = {}) => {
    const response = await api.get("/operation/email-logs/", { params });
    return response.data;
  },
};

export default EmailService;
