import api from "./axios";

const getActiveCompanyId = () => {
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const username = user?.username;
  if (!username) return null;

  const cachedCompanyId = localStorage.getItem(`header:company:${username}:id`);
  if (!cachedCompanyId) return null;

  const parsed = Number(cachedCompanyId);
  return Number.isFinite(parsed) ? parsed : null;
};

const withCompanyQuery = (params = {}) => {
  const next = { ...params };
  if (!next.company) {
    const companyId = getActiveCompanyId();
    if (companyId) next.company = companyId;
  }
  return next;
};

const withCompanyPayload = (data = {}) => {
  const next = { ...data };
  if (!next.company && !next.company_id) {
    const companyId = getActiveCompanyId();
    if (companyId) next.company_id = companyId;
  }
  return next;
};

export const getQuestions = (params) =>
  api.get("chat/help/", { params: withCompanyQuery(params) });

export const getQuestion = (id, params) =>
  api.get(`chat/help/${id}/`, { params: withCompanyQuery(params) });

export const createQuestion = (data) =>
  api.post("chat/help/", withCompanyPayload(data));

export const updateQuestion = (id, data) =>
  api.patch(`chat/help/${id}/`, withCompanyPayload(data));

export const deleteQuestion = (id) => api.delete(`chat/help/${id}/`);

export const createAnswer = (data) =>
  api.post("chat/help-answers/", withCompanyPayload(data));

export const updateAnswer = (id, data) =>
  api.patch(`chat/help-answers/${id}/`, withCompanyPayload(data));

export const deleteAnswer = (id) => api.delete(`chat/help-answers/${id}/`);

export const getUnansweredCount = (companyId) =>
  api.get("chat/help/unanswered_count/", {
    params: withCompanyQuery(companyId ? { company: companyId } : {}),
  });

export const getHelpStats = (params) =>
  api.get("chat/help/stats/", { params: withCompanyQuery(params) });
