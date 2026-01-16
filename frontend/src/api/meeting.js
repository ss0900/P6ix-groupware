// src/api/meeting.js
import api from "./axios";

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

export const meetingApi = {
  // 회의 CRUD
  list: (params) => api.get("/meeting/meetings/", { params }),
  retrieve: (id) => api.get(`/meeting/meetings/${id}/`),
  create: (data) => api.post("/meeting/meetings/", data),
  update: (id, data) => api.patch(`/meeting/meetings/${id}/`, data),
  remove: (id) => api.delete(`/meeting/meetings/${id}/`),
  
  // 본인 정보
  me: () => api.get("/meeting/meetings/me/"),
  
  // RSVP
  rsvp: (id, isAttending) =>
    api.post(`/meeting/meetings/${id}/rsvp/`, { is_attending: !!isAttending }),
  rsvpReset: (id) => api.post(`/meeting/meetings/${id}/reset_rsvp/`),
  
  // 참석자 목록
  participants: (id) => api.get(`/meeting/meetings/${id}/participants/`),
  
  // 회의실 관리
  rooms: {
    list: (params) => api.get("/meeting/rooms/", { params }),
    create: (data) => api.post("/meeting/rooms/", data),
    update: (id, data) => api.patch(`/meeting/rooms/${id}/`, data),
    remove: (id) => api.delete(`/meeting/rooms/${id}/`),
    reorder: (orderedIds) =>
      api.post("/meeting/rooms/reorder/", { ordered_ids: orderedIds }),
    availability: (id, date) =>
      api.get(`/meeting/rooms/${id}/availability/`, { params: { date } }),
  },
};

export default meetingApi;
