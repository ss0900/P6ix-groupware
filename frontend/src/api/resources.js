// src/api/resources.js
import api from "./axios";

const ResourceService = {
  // ==================== 폴더 ====================
  
  /**
   * 폴더 목록 조회
   * @param {Object} params - 쿼리 파라미터 { parent: string }
   */
  getFolders: async (params = {}) => {
    try {
      const response = await api.get("/resources/folders/", { params });
      return response.data?.results ?? response.data ?? [];
    } catch (error) {
      console.error("Error fetching folders:", error);
      throw error;
    }
  },

  /**
   * 폴더 트리 조회
   */
  getFolderTree: async () => {
    try {
      const response = await api.get("/resources/folders/tree/");
      return response.data;
    } catch (error) {
      console.error("Error fetching folder tree:", error);
      throw error;
    }
  },

  /**
   * 폴더 내용 조회 (하위 폴더 + 파일)
   * @param {number} folderId
   */
  getFolderContents: async (folderId) => {
    try {
      const response = await api.get(`/resources/folders/${folderId}/contents/`);
      return response.data;
    } catch (error) {
      console.error("Error fetching folder contents:", error);
      throw error;
    }
  },

  /**
   * 폴더 생성
   * @param {Object} data - { name, parent?, description?, is_public?, owner_scope? }
   */
  createFolder: async (data) => {
    try {
      const response = await api.post("/resources/folders/", data);
      return response.data;
    } catch (error) {
      console.error("Error creating folder:", error);
      throw error;
    }
  },

  /**
   * 폴더 이름 변경
   * @param {number} folderId
   * @param {string} name
   */
  renameFolder: async (folderId, name) => {
    try {
      const response = await api.post(`/resources/folders/${folderId}/rename/`, { name });
      return response.data;
    } catch (error) {
      console.error("Error renaming folder:", error);
      throw error;
    }
  },

  /**
   * 폴더 이동
   * @param {number} folderId
   * @param {number|null} parentId
   */
  moveFolder: async (folderId, parentId) => {
    try {
      const response = await api.post(`/resources/folders/${folderId}/move/`, { parent: parentId });
      return response.data;
    } catch (error) {
      console.error("Error moving folder:", error);
      throw error;
    }
  },

  /**
   * 폴더 삭제 (휴지통으로 이동)
   * @param {number} folderId
   */
  deleteFolder: async (folderId) => {
    try {
      const response = await api.post(`/resources/folders/${folderId}/soft_delete/`);
      return response.data;
    } catch (error) {
      console.error("Error deleting folder:", error);
      throw error;
    }
  },

  // ==================== 파일 ====================
  
  /**
   * 파일 목록 조회
   * @param {Object} params - { folder?, type?, search?, ordering?, temporary? }
   */
  getFiles: async (params = {}) => {
    try {
      const response = await api.get("/resources/files/", { params });
      return response.data?.results ?? response.data ?? [];
    } catch (error) {
      console.error("Error fetching files:", error);
      throw error;
    }
  },

  /**
   * 파일 상세 조회
   * @param {number} fileId
   */
  getFile: async (fileId) => {
    try {
      const response = await api.get(`/resources/files/${fileId}/`);
      return response.data;
    } catch (error) {
      console.error("Error fetching file:", error);
      throw error;
    }
  },

  /**
   * 최근 파일 조회
   */
  getRecentFiles: async () => {
    try {
      const response = await api.get("/resources/files/recent/");
      return response.data;
    } catch (error) {
      console.error("Error fetching recent files:", error);
      throw error;
    }
  },

  /**
   * 파일 업로드
   * @param {FormData} formData - { file, name?, folder?, description?, tags? }
   * @param {Function} onProgress - 진행률 콜백
   */
  uploadFile: async (formData, onProgress = null) => {
    try {
      const config = {
        headers: { "Content-Type": "multipart/form-data" },
      };
      
      if (onProgress) {
        config.onUploadProgress = (progressEvent) => {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        };
      }
      
      const response = await api.post("/resources/files/", formData, config);
      return response.data;
    } catch (error) {
      console.error("Error uploading file:", error);
      throw error;
    }
  },

  /**
   * 파일 다운로드
   * @param {number} fileId
   * @param {string} fileName
   */
  downloadFile: async (fileId, fileName) => {
    try {
      const response = await api.get(`/resources/files/${fileId}/download/`, {
        responseType: "blob",
      });
      
      // 브라우저에서 다운로드 트리거
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      return true;
    } catch (error) {
      console.error("Error downloading file:", error);
      throw error;
    }
  },

  /**
   * 파일 이름 변경
   * @param {number} fileId
   * @param {string} name
   */
  renameFile: async (fileId, name) => {
    try {
      const response = await api.post(`/resources/files/${fileId}/rename/`, { name });
      return response.data;
    } catch (error) {
      console.error("Error renaming file:", error);
      throw error;
    }
  },

  /**
   * 파일 이동
   * @param {number} fileId
   * @param {number|null} folderId
   */
  moveFile: async (fileId, folderId) => {
    try {
      const response = await api.post(`/resources/files/${fileId}/move/`, { folder: folderId });
      return response.data;
    } catch (error) {
      console.error("Error moving file:", error);
      throw error;
    }
  },

  /**
   * 파일 삭제 (휴지통으로 이동)
   * @param {number} fileId
   */
  deleteFile: async (fileId) => {
    try {
      const response = await api.post(`/resources/files/${fileId}/soft_delete/`);
      return response.data;
    } catch (error) {
      console.error("Error deleting file:", error);
      throw error;
    }
  },

  /**
   * 다운로드 이력 조회
   * @param {number} fileId
   */
  getDownloadHistory: async (fileId) => {
    try {
      const response = await api.get(`/resources/files/${fileId}/history/`);
      return response.data;
    } catch (error) {
      console.error("Error fetching download history:", error);
      throw error;
    }
  },

  // ==================== 휴지통 ====================
  
  /**
   * 휴지통 목록 조회
   */
  getTrash: async () => {
    try {
      const response = await api.get("/resources/trash/");
      return response.data;
    } catch (error) {
      console.error("Error fetching trash:", error);
      throw error;
    }
  },

  /**
   * 휴지통에서 복원
   * @param {number} id
   * @param {string} type - 'folder' or 'file'
   */
  restoreItem: async (id, type = 'file') => {
    try {
      const response = await api.post(`/resources/trash/${id}/restore/`, { type });
      return response.data;
    } catch (error) {
      console.error("Error restoring item:", error);
      throw error;
    }
  },

  /**
   * 영구 삭제
   * @param {number} id
   * @param {string} type - 'folder' or 'file'
   */
  purgeItem: async (id, type = 'file') => {
    try {
      const response = await api.delete(`/resources/trash/${id}/purge/`, { 
        data: { type } 
      });
      return response.data;
    } catch (error) {
      console.error("Error purging item:", error);
      throw error;
    }
  },

  // ==================== 첨부파일 허브 ====================
  
  /**
   * 첨부파일 목록 조회
   * @param {Object} params - { source_type?, source_id? }
   */
  getAttachments: async (params = {}) => {
    try {
      const response = await api.get("/resources/attachments/", { params });
      return response.data?.results ?? response.data ?? [];
    } catch (error) {
      console.error("Error fetching attachments:", error);
      throw error;
    }
  },

  /**
   * 내 첨부파일 목록 조회
   */
  getMyAttachments: async () => {
    try {
      const response = await api.get("/resources/attachments/mine/");
      return response.data;
    } catch (error) {
      console.error("Error fetching my attachments:", error);
      throw error;
    }
  },

  // ==================== 활동 로그 ====================
  
  /**
   * 활동 로그 조회
   * @param {Object} params - { action?, user?, start_date?, end_date? }
   */
  getActivityLog: async (params = {}) => {
    try {
      const response = await api.get("/resources/activity/", { params });
      return response.data?.results ?? response.data ?? [];
    } catch (error) {
      console.error("Error fetching activity log:", error);
      throw error;
    }
  },
};

export default ResourceService;
