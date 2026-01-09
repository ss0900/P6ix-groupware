import api from "../axios";

export const listDepartments = (params) =>
  api.get("core/departments/", { params });
export const createDepartment = (data) => api.post("core/departments/", data);
export const updateDepartment = (id, data) =>
  api.put(`core/departments/${id}/`, data);
export const patchDepartment = (id, data) =>
  api.patch(`core/departments/${id}/`, data);
export const deleteDepartment = (id) => api.delete(`core/departments/${id}/`);
