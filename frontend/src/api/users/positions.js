import api from "../axios";

// 회사별 직급 목록 (companyId 필터 가능)
export const listPositions = (companyId) =>
  api.get("core/positions/", { params: { company: companyId } });

// 직급 생성 시 회사 포함

export const createPosition = (data) => api.post("core/positions/", data);

export const updatePosition = (id, data) =>
  api.put(`core/positions/${id}/`, data);

export const patchPosition = (id, data) =>
  api.patch(`core/positions/${id}/`, data);

export const deletePosition = (id) => api.delete(`core/positions/${id}/`);
export const reorderPositions = (ordered_ids) =>
  api.post("core/positions/reorder/", { ordered_ids });
