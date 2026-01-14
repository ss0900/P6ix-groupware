// src/api/operation/customers.js
/**
 * 영업관리 - 고객사/담당자 API
 */
import api from "../axios";

const CustomerService = {
  // ============================================================
  // 고객사 (Companies)
  // ============================================================
  getCompanies: async (params = {}) => {
    const response = await api.get("/operation/customers/companies/", { params });
    return response.data;
  },

  getCompany: async (id) => {
    const response = await api.get(`/operation/customers/companies/${id}/`);
    return response.data;
  },

  createCompany: async (data) => {
    const response = await api.post("/operation/customers/companies/", data);
    return response.data;
  },

  updateCompany: async (id, data) => {
    const response = await api.patch(`/operation/customers/companies/${id}/`, data);
    return response.data;
  },

  deleteCompany: async (id) => {
    await api.delete(`/operation/customers/companies/${id}/`);
  },

  // ============================================================
  // 담당자 (Contacts)
  // ============================================================
  getContacts: async (params = {}) => {
    const response = await api.get("/operation/customers/contacts/", { params });
    return response.data.results || response.data;
  },

  getContact: async (id) => {
    const response = await api.get(`/operation/customers/contacts/${id}/`);
    return response.data;
  },

  createContact: async (data) => {
    const response = await api.post("/operation/customers/contacts/", data);
    return response.data;
  },

  updateContact: async (id, data) => {
    const response = await api.patch(`/operation/customers/contacts/${id}/`, data);
    return response.data;
  },

  deleteContact: async (id) => {
    await api.delete(`/operation/customers/contacts/${id}/`);
  },
};

export default CustomerService;
