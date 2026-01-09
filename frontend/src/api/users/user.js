// src/api/users.js
import api from "../axios";

/* =========================
 * 유저 목록
 * ========================= */
export const fetchUsers = () => api.get("core/users/");

/* =========================
 * 유저 생성
 * ========================= */
export const createUser = (data) => {
  return api.post("core/users/", data, {
    headers: { "Content-Type": "application/json" },
  });
};

/* =========================
 * 유저 수정
 * ========================= */
export const updateUser = (id, userData) =>
  api.put(`core/users/${id}/`, userData);

/* =========================
 * 유저 삭제
 * ========================= */
export const deleteUser = (id) => api.delete(`core/users/${id}/`);

/* =========================
 * 유저 상세 조회
 * - UserWithMembershipSerializer 응답
 * - company, first_name, last_name 포함
 * ========================= */
export const fetchUserDetail = (id) => api.get(`core/users/${id}/`);

/* =========================
 * 문서 결재 서명 조회 (🔥 추가)
 * =========================
 * @param {string} dns
 * @param {string} project
 * @param {number} userId
 */
