// src/api/schedule.js
import api from "./axios";

// JWT에서 사용자 ID 추출
export function getMyUserIdFromToken() {
  try {
    const t = localStorage.getItem("access");
    if (!t) return null;
    const [, p] = t.split(".");
    const json = JSON.parse(atob(p.replace(/-/g, "+").replace(/_/g, "/")));
    return json.user_id ?? json.user?.id ?? null;
  } catch {
    return null;
  }
}

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

  // 회의만 조회
  listMeetings: (params) => api.get("/meeting/schedules/meetings/", { params }),

  // 오늘/다가오는 일정/금주 일정
  today: () => api.get("/meeting/schedules/today/"),
  upcoming: () => api.get("/meeting/schedules/upcoming/"),
  thisWeek: () => api.get("/meeting/schedules/this_week/"),

  // CRUD
  detail: (id) => api.get(`/meeting/schedules/${id}/`),
  create: (data) => api.post("/meeting/schedules/", data),
  update: (id, data) => api.put(`/meeting/schedules/${id}/`, data),
  patch: (id, data) => api.patch(`/meeting/schedules/${id}/`, data),
  remove: (id) => api.delete(`/meeting/schedules/${id}/`),

  // 참석 응답 (일반 일정)
  respond: (id, response) =>
    api.post(`/meeting/schedules/${id}/respond/`, { response }),

  // ===== RSVP (회의용) =====
  me: () => api.get("/meeting/schedules/me/"),
  rsvp: (id, isAttending) =>
    api.post(`/meeting/schedules/${id}/rsvp/`, { is_attending: !!isAttending }),
  rsvpReset: (id) => api.post(`/meeting/schedules/${id}/reset_rsvp/`),
  participants: (id) => api.get(`/meeting/schedules/${id}/participants/`),
};

// 캘린더 API
export const calendarApi = {
  list: (params) => api.get("/meeting/calendars/", { params }),
  myCalendars: () => api.get("/meeting/calendars/my_calendars/"),
  customCalendars: () => api.get("/meeting/calendars/custom_calendars/"),
  detail: (id) => api.get(`/meeting/calendars/${id}/`),
  create: (data) => api.post("/meeting/calendars/", data),
  createCustom: (data) => api.post("/meeting/calendars/create_custom/", data),
  update: (id, data) => api.put(`/meeting/calendars/${id}/`, data),
  remove: (id) => api.delete(`/meeting/calendars/${id}/`),
  reorder: (orderedIds) =>
    api.post("/meeting/calendars/reorder/", { ordered_ids: orderedIds }),
};

// 자원 API (회의실 통합)
export const resourceApi = {
  list: (params) => api.get("/meeting/resources/", { params }),
  detail: (id) => api.get(`/meeting/resources/${id}/`),
  create: (data) => api.post("/meeting/resources/", data),
  update: (id, data) => api.put(`/meeting/resources/${id}/`, data),
  remove: (id) => api.delete(`/meeting/resources/${id}/`),

  // 회의실 전용 (MeetingRoom 대체)
  rooms: (params) => api.get("/meeting/resources/rooms/", { params }),
  reorder: (orderedIds) =>
    api.post("/meeting/resources/reorder/", { ordered_ids: orderedIds }),

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
