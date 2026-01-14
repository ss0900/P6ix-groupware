// src/api/operation/quotes.js
/**
 * 영업관리 - 견적서/템플릿 API
 */
import api from "../axios";

const QuoteService = {
  // ============================================================
  // 견적서 (Quotes)
  // ============================================================
  getQuotes: async (params = {}) => {
    const response = await api.get("/operation/quotes/", { params });
    return response.data;
  },

  getQuote: async (id) => {
    const response = await api.get(`/operation/quotes/${id}/`);
    return response.data;
  },

  createQuote: async (data) => {
    const response = await api.post("/operation/quotes/", data);
    return response.data;
  },

  updateQuote: async (id, data) => {
    const response = await api.patch(`/operation/quotes/${id}/`, data);
    return response.data;
  },

  deleteQuote: async (id) => {
    await api.delete(`/operation/quotes/${id}/`);
  },

  sendQuote: async (id) => {
    const response = await api.post(`/operation/quotes/${id}/send/`);
    return response.data;
  },

  addItem: async (quoteId, itemData) => {
    const response = await api.post(`/operation/quotes/${quoteId}/add_item/`, itemData);
    return response.data;
  },

  removeItem: async (quoteId, itemId) => {
    const response = await api.delete(`/operation/quotes/${quoteId}/items/${itemId}/`);
    return response.data;
  },

  // ============================================================
  // 견적 템플릿 (Templates)
  // ============================================================
  getTemplates: async () => {
    const response = await api.get("/operation/quote-templates/");
    return response.data.results || response.data;
  },

  getTemplate: async (id) => {
    const response = await api.get(`/operation/quote-templates/${id}/`);
    return response.data;
  },

  createTemplate: async (data) => {
    const response = await api.post("/operation/quote-templates/", data);
    return response.data;
  },

  updateTemplate: async (id, data) => {
    const response = await api.patch(`/operation/quote-templates/${id}/`, data);
    return response.data;
  },

  deleteTemplate: async (id) => {
    await api.delete(`/operation/quote-templates/${id}/`);
  },
};

export default QuoteService;
