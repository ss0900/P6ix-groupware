// src/api/axios.js
import axios from "axios";

const baseURL = process.env.REACT_APP_API_BASE || "/api";
const PERSIST_LOGIN =
  String(process.env.REACT_APP_PERSIST_LOGIN).toLowerCase() === "true";

/** Django 기본 csrftoken 쿠키를 읽어오는 유틸 */
function getCookie(name) {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(";").shift();
  return null;
}

const api = axios.create({
  baseURL: baseURL.endsWith("/") ? baseURL : `${baseURL}/`,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

// refresh 전용 클라이언트(인터셉터 없음)
const refreshClient = axios.create({
  baseURL: api.defaults.baseURL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

// 최초 실행 시 Authorization 세팅
const initToken = localStorage.getItem("access");
if (initToken) {
  api.defaults.headers.common.Authorization = `Bearer ${initToken}`;
}

// -------------------- 요청 인터셉터 --------------------
api.interceptors.request.use((config) => {
  // 1) JWT Authorization
  const token = localStorage.getItem("access");
  if (token) config.headers.Authorization = `Bearer ${token}`;

  // 2) CSRF
  const csrfToken = getCookie("csrftoken");
  if (csrfToken) config.headers["X-CSRFToken"] = csrfToken;

  return config;
});

// -------------------- 응답 인터셉터 (401 → refresh) --------------------
let isRefreshing = false;
let queue = [];
function processQueue(error, token = null) {
  queue.forEach(({ resolve, reject }) =>
    error ? reject(error) : resolve(token)
  );
  queue = [];
}
function setAccessToken(access) {
  localStorage.setItem("access", access);
  api.defaults.headers.common.Authorization = `Bearer ${access}`;
}
function forceLogout() {
  if (PERSIST_LOGIN) {
    localStorage.setItem("__auth_error", "refresh_invalid");
    return;
  }
  localStorage.removeItem("access");
  localStorage.removeItem("refresh");
  window.location.href = "/login";
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;
    if (!error.response) return Promise.reject(error);

    const status = error.response.status;
    const code = error.response.data?.code;
    const url = originalRequest?.url || "";
    const isAuthEndpoint =
      url.includes("token/refresh") || url.includes("token/verify");
    if (isAuthEndpoint) return Promise.reject(error);

    const looksExpired =
      code === "token_not_valid" ||
      String(error.response.data?.detail || "")
        .toLowerCase()
        .includes("token");

    if (status === 401 && looksExpired && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          queue.push({
            resolve: (token) => {
              if (token)
                originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(api(originalRequest));
            },
            reject,
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refresh = localStorage.getItem("refresh");
        if (!refresh) {
          forceLogout();
          return Promise.reject(error);
        }
        const res = await refreshClient.post("token/refresh/", { refresh });
        const newAccess = res.data?.access;
        if (!newAccess) {
          forceLogout();
          return Promise.reject(error);
        }
        setAccessToken(newAccess);
        processQueue(null, newAccess);
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        return api(originalRequest);
      } catch (err) {
        processQueue(err, null);
        const rStatus = err.response?.status;
        const rCode = err.response?.data?.code;
        if (rStatus === 401 || rStatus === 403 || rCode === "token_not_valid") {
          forceLogout();
        }
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;

// ================== 🔥 UNREAD COUNT POLLING (전역) ==================
// 알림 120초마다 갱신
let unreadTimer = null;
let unreadCallback = null;

export const setUnreadListener = (cb, intervalMs = 120000) => {
  unreadCallback = cb;
  if (unreadTimer) {
    clearInterval(unreadTimer);
    unreadTimer = null;
  }

  // 즉시 한 번 호출
  (async () => {
    try {
      const res = await api.get("core/alerts/unread-count/");
      unreadCallback?.(res.data.count);
    } catch (e) {
      console.error("Unread count initial fetch error:", e);
    }
  })();

  // 주기적 폴링
  unreadTimer = setInterval(async () => {
    try {
      const res = await api.get("core/alerts/unread-count/");
      unreadCallback?.(res.data.count);
    } catch (e) {
      console.error("Unread count polling error:", e);
    }
  }, intervalMs);
};
