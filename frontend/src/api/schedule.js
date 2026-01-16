// src/api/schedule.js
import api from "./axios";

export const scheduleApi = {
  // 일정 목록
  list: (params) => api.get("/meeting/schedules/", { params }),
  
  // scope별 조회
  listPersonal: () => api.get("/meeting/schedules/?scope=personal"),
  listCompany: (companyId) =>
    api.get(`/meeting/schedules/?scope=company${companyId ? `&company=${companyId}` : ""}`),
  
  // 월별 조회
  listByMonth: (year, month) =>
    api.get(`/meeting/schedules/?year=${year}&month=${month}`),
  
  // 오늘/다가오는 일정
  today: () => api.get("/meeting/schedules/today/"),
  upcoming: () => api.get("/meeting/schedules/upcoming/"),
  
  // CRUD
  detail: (id) => api.get(`/meeting/schedules/${id}/`),
  create: (data) => api.post("/meeting/schedules/", data),
  update: (id, data) => api.put(`/meeting/schedules/${id}/`, data),
  remove: (id) => api.delete(`/meeting/schedules/${id}/`),
  
  // 참석 응답
  respond: (id, response) =>
    api.post(`/meeting/schedules/${id}/respond/`, { response }),
};

export default scheduleApi;
