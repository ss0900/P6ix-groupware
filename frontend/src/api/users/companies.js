import api from "../axios";

// 회사
export const listCompanies = (params) => api.get("core/companies/", { params });
export const createCompany = (data) => api.post("core/companies/", data);
export const retrieveCompany = (id) => api.get(`core/companies/${id}/`);
export const updateCompany = (id, data) =>
  api.put(`core/companies/${id}/`, data);
export const patchCompany = (id, data) =>
  api.patch(`core/companies/${id}/`, data);
export const deleteCompany = (id) => api.delete(`core/companies/${id}/`);

// // 공장
// export const listFactories = (params) => api.get("factories/", { params });
// export const createFactory = (data) => api.post("factories/", data);
// export const updateFactory = (id, data) => api.put(`factories/${id}/`, data);
// export const patchFactory = (id, data) => api.patch(`factories/${id}/`, data);
// export const deleteFactory = (id) => api.delete(`factories/${id}/`);
export const uploadCompanyLogo = (id, file) => {
  const formData = new FormData();
  formData.append("file", file);
  return api.post(`core/companies/${id}/upload-logo/`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};
