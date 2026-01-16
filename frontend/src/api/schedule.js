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
  
  // 기간 조회
  listByRange: (dateFrom, dateTo, calendarIds, eventType, search) => {
    const params = new URLSearchParams();
    if (dateFrom) params.append("date_from", dateFrom);
    if (dateTo) params.append("date_to", dateTo);
    if (calendarIds?.length) params.append("calendar_ids", calendarIds.join(","));
    if (eventType) params.append("event_type", eventType);
    if (search) params.append("search", search);
    return api.get(`/meeting/schedules/?${params.toString()}`);
  },
  
  // 오늘/다가오는 일정/금주 일정
  today: () => api.get("/meeting/schedules/today/"),
  upcoming: () => api.get("/meeting/schedules/upcoming/"),
  thisWeek: () => api.get("/meeting/schedules/this_week/"),
  
  // CRUD
  detail: (id) => api.get(`/meeting/schedules/${id}/`),
  create: (data) => api.post("/meeting/schedules/", data),
  update: (id, data) => api.put(`/meeting/schedules/${id}/`, data),
  remove: (id) => api.delete(`/meeting/schedules/${id}/`),
  
  // 참석 응답
  respond: (id, response) =>
    api.post(`/meeting/schedules/${id}/respond/`, { response }),
};

// 캘린더 API
export const calendarApi = {
  list: (params) => api.get("/meeting/calendars/", { params }),
  myCalendars: () => api.get("/meeting/calendars/my_calendars/"),
  detail: (id) => api.get(`/meeting/calendars/${id}/`),
  create: (data) => api.post("/meeting/calendars/", data),
  update: (id, data) => api.put(`/meeting/calendars/${id}/`, data),
  remove: (id) => api.delete(`/meeting/calendars/${id}/`),
};

// 자원 API
export const resourceApi = {
  list: (params) => api.get("/meeting/resources/", { params }),
  detail: (id) => api.get(`/meeting/resources/${id}/`),
  create: (data) => api.post("/meeting/resources/", data),
  update: (id, data) => api.put(`/meeting/resources/${id}/`, data),
  remove: (id) => api.delete(`/meeting/resources/${id}/`),
  
  // 가용성 조회
  availability: (id, params) => api.get(`/meeting/resources/${id}/availability/`, { params }),
  
  // 사용 가능한 자원 찾기
  available: (start, end, resourceType) => {
    const params = new URLSearchParams({ start, end });
    if (resourceType) params.append("resource_type", resourceType);
    return api.get(`/meeting/resources/available/?${params.toString()}`);
  },
};

// 자원 예약 API
export const reservationApi = {
  list: (params) => api.get("/meeting/reservations/", { params }),
  detail: (id) => api.get(`/meeting/reservations/${id}/`),
  create: (data) => api.post("/meeting/reservations/", data),
  update: (id, data) => api.put(`/meeting/reservations/${id}/`, data),
  remove: (id) => api.delete(`/meeting/reservations/${id}/`),
  
  // 승인/반려
  approve: (id) => api.post(`/meeting/reservations/${id}/approve/`),
  reject: (id, reason) => api.post(`/meeting/reservations/${id}/reject/`, { reason }),
};

export default scheduleApi;

