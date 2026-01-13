// src/api/ContactApi.js
import api from "./axios";

const BASE = "contact/messages/";

/**
 * 메시지 목록 조회
 * @param {object} params - { folder, search, starred }
 */
export const getMessages = async (params = {}) => {
  const res = await api.get(BASE, { params });
  return res.data;
};

/**
 * 메시지 상세 조회
 * @param {number} id
 */
export const getMessage = async (id) => {
  const res = await api.get(`${BASE}${id}/`);
  return res.data;
};

/**
 * 메시지 생성
 * @param {FormData|object} data
 */
export const createMessage = async (data) => {
  const isFormData = data instanceof FormData;
  const res = await api.post(BASE, data, {
    headers: isFormData ? { "Content-Type": "multipart/form-data" } : undefined,
  });
  return res.data;
};

/**
 * 메시지 수정
 * @param {number} id
 * @param {FormData|object} data
 */
export const updateMessage = async (id, data) => {
  const isFormData = data instanceof FormData;
  const res = await api.patch(`${BASE}${id}/`, data, {
    headers: isFormData ? { "Content-Type": "multipart/form-data" } : undefined,
  });
  return res.data;
};

/**
 * 메시지 삭제
 * @param {number} id
 */
export const deleteMessage = async (id) => {
  const res = await api.delete(`${BASE}${id}/`);
  return res.data;
};

/**
 * 읽음 표시
 * @param {number} id
 */
export const markAsRead = async (id) => {
  const res = await api.post(`${BASE}${id}/mark_read/`);
  return res.data;
};

/**
 * 안읽음 표시
 * @param {number} id
 */
export const markAsUnread = async (id) => {
  const res = await api.post(`${BASE}${id}/mark_unread/`);
  return res.data;
};

/**
 * 별표 토글
 * @param {number} id
 */
export const toggleStar = async (id) => {
  const res = await api.post(`${BASE}${id}/toggle_star/`);
  return res.data;
};

/**
 * 휴지통으로 이동
 * @param {number} id
 */
export const moveToTrash = async (id) => {
  const res = await api.post(`${BASE}${id}/move_to_trash/`);
  return res.data;
};

/**
 * 복원
 * @param {number} id
 */
export const restoreMessage = async (id) => {
  const res = await api.post(`${BASE}${id}/restore/`);
  return res.data;
};

/**
 * 폴더별 개수 조회
 */
export const getFolderCounts = async () => {
  const res = await api.get(`${BASE}folder_counts/`);
  return res.data;
};

/**
 * 댓글 목록 조회
 * @param {number} messageId
 */
export const getComments = async (messageId) => {
  const res = await api.get(`${BASE}${messageId}/comments/`);
  return res.data;
};

/**
 * 댓글 작성
 * @param {number} messageId
 * @param {object} data - { content }
 */
export const createComment = async (messageId, data) => {
  const res = await api.post(`${BASE}${messageId}/comments/`, data);
  return res.data;
};

/**
 * 댓글 삭제
 * @param {number} messageId
 * @param {number} commentId
 */
export const deleteComment = async (messageId, commentId) => {
  const res = await api.delete(`${BASE}${messageId}/comments/${commentId}/`);
  return res.data;
};

export default {
  getMessages,
  getMessage,
  createMessage,
  updateMessage,
  deleteMessage,
  markAsRead,
  markAsUnread,
  toggleStar,
  moveToTrash,
  restoreMessage,
  getFolderCounts,
  getComments,
  createComment,
  deleteComment,
};
