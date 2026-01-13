// src/api/board.js
import api from "./axios";

const BoardService = {
  /**
   * 게시판 목록 조회
   * @param {Object} options - 옵션 객체
   * @param {boolean} options.flat - flat 조회 여부
   * @param {string} options.excludeNames - 제외할 게시판 이름 (콤마 구분)
   * @param {string} options.excludeTypes - 제외할 게시판 타입 (콤마 구분)
   */
  getBoards: async (options = {}) => {
    try {
      const isFlat = typeof options === 'boolean' ? options : options?.flat;
      const excludeNames = options?.excludeNames;
      const excludeTypes = options?.excludeTypes;

      let url = `/board/boards/`;
      const params = new URLSearchParams();
      
      if (isFlat) params.append('flat', 'true');
      if (excludeNames) params.append('exclude_names', excludeNames);
      if (excludeTypes) params.append('exclude_board_types', excludeTypes);

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await api.get(url);
      if (response.data && Array.isArray(response.data.results)) {
        return response.data.results;
      }
      return response.data;
    } catch (error) {
      console.error("Error fetching boards:", error);
      throw error;
    }
  },

  /**
   * 게시글 목록 조회
   */
  getPosts: async (params) => {
    try {
      const response = await api.get(`/board/posts/`, { params });
      return response.data;
    } catch (error) {
      console.error("Error fetching posts:", error);
      throw error;
    }
  },

  /**
   * 게시글 상세 조회
   */
  getPost: async (id) => {
    try {
      const response = await api.get(`/board/posts/${id}/`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching post ${id}:`, error);
      throw error;
    }
  },

  /**
   * 게시글 생성
   */
  createPost: async (data) => {
    try {
      const config = (data instanceof FormData) 
        ? { headers: { "Content-Type": "multipart/form-data" } }
        : {};
      const response = await api.post("/board/posts/", data, config);
      return response.data;
    } catch (error) {
      console.error("Error creating post:", error);
      throw error;
    }
  },

  /**
   * 게시글 수정
   */
  updatePost: async (id, data) => {
    try {
      const config = (data instanceof FormData) 
        ? { headers: { "Content-Type": "multipart/form-data" } }
        : {};
      const response = await api.patch(`/board/posts/${id}/`, data, config);
      return response.data;
    } catch (error) {
      console.error(`Error updating post ${id}:`, error);
      throw error;
    }
  },

  /**
   * 게시글 삭제
   */
  deletePost: async (id) => {
    try {
      await api.delete(`/board/posts/${id}/`);
    } catch (error) {
      console.error(`Error deleting post ${id}:`, error);
      throw error;
    }
  },

  /**
   * 게시판 생성
   */
  createBoard: async (data) => {
    try {
      const response = await api.post("/board/boards/", data);
      return response.data;
    } catch (error) {
      console.error("Error creating board:", error);
      throw error;
    }
  },

  /**
   * 게시판 수정
   */
  updateBoard: async (boardId, data) => {
    try {
      const response = await api.patch(`/board/boards/${boardId}/`, data);
      return response.data;
    } catch (error) {
      console.error("Error updating board:", error);
      throw error;
    }
  },

  /**
   * 게시판 삭제
   */
  deleteBoard: async (boardId) => {
    try {
      await api.delete(`/board/boards/${boardId}/`);
    } catch (error) {
      console.error("Error deleting board:", error);
      throw error;
    }
  },
};

export default BoardService;
