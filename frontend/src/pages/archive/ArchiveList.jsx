// src/pages/archive/ArchiveList.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import { 
  Folder, 
  File, 
  Upload, 
  Download, 
  Search, 
  Plus,
  FolderPlus,
  ChevronRight,
  Image,
  FileText,
  Film,
  Archive as ArchiveIcon,
  Eye,
  MoreVertical,
  ArrowLeft
} from "lucide-react";

// 파일 유형 아이콘
const getFileIcon = (type) => {
  const icons = {
    image: Image,
    document: FileText,
    video: Film,
    archive: ArchiveIcon,
    file: File,
  };
  return icons[type] || File;
};

// 파일 크기 포맷
const formatFileSize = (bytes) => {
  if (!bytes) return "0 B";
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
};

export default function ArchiveList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [folders, setFolders] = useState([]);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [uploading, setUploading] = useState(false);

  const folderId = searchParams.get("folder") || "";

  // 폴더 및 파일 로드
  const loadContents = useCallback(async () => {
    setLoading(true);
    try {
      if (folderId) {
        // 특정 폴더 내용
        const res = await api.get(`resources/folders/${folderId}/contents/`);
        setCurrentFolder(res.data.folder);
        setFolders(res.data.subfolders || []);
        setResources(res.data.resources || []);
      } else {
        // 루트 폴더 목록
        const [foldersRes, filesRes] = await Promise.all([
          api.get("resources/folders/?parent="),
          api.get("resources/files/?folder="),
        ]);
        setCurrentFolder(null);
        setFolders(foldersRes.data?.results ?? foldersRes.data ?? []);
        setResources(filesRes.data?.results ?? filesRes.data ?? []);
      }
    } catch (err) {
      console.error("Failed to load contents:", err);
    } finally {
      setLoading(false);
    }
  }, [folderId]);

  useEffect(() => {
    loadContents();
  }, [loadContents]);

  // 폴더 이동
  const navigateToFolder = (folder) => {
    if (folder) {
      setSearchParams({ folder: folder.id });
    } else {
      setSearchParams({});
    }
  };

  // 새 폴더 생성
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    try {
      await api.post("resources/folders/", {
        name: newFolderName,
        parent: folderId || null,
      });
      setNewFolderName("");
      setShowNewFolder(false);
      loadContents();
    } catch (err) {
      console.error(err);
      alert("폴더 생성 중 오류가 발생했습니다.");
    }
  };

  // 파일 업로드
  const handleFileUpload = async (e) => {
    const files = e.target.files;
    if (!files.length) return;

    setUploading(true);
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("name", file.name);
        if (folderId) formData.append("folder", folderId);

        await api.post("resources/files/", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }
      loadContents();
    } catch (err) {
      console.error(err);
      alert("업로드 중 오류가 발생했습니다.");
    } finally {
      setUploading(false);
    }
  };

  // 파일 다운로드
  const handleDownload = async (resource) => {
    try {
      const res = await api.get(`resources/files/${resource.id}/download/`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(res.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = resource.name;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("다운로드 중 오류가 발생했습니다.");
    }
  };

  // 검색 필터
  const filteredResources = resources.filter((r) =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">자료실</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowNewFolder(true)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <FolderPlus size={18} />
            새 폴더
          </button>
          <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer">
            <Upload size={18} />
            {uploading ? "업로드 중..." : "파일 업로드"}
            <input
              type="file"
              multiple
              onChange={handleFileUpload}
              className="hidden"
              disabled={uploading}
            />
          </label>
        </div>
      </div>

      {/* 경로 */}
      <div className="flex items-center gap-2 text-sm">
        <button
          onClick={() => navigateToFolder(null)}
          className="text-blue-600 hover:underline"
        >
          자료실
        </button>
        {currentFolder && (
          <>
            <ChevronRight size={16} className="text-gray-400" />
            <span className="text-gray-700">{currentFolder.name}</span>
          </>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        {/* 검색 */}
        <div className="p-4 border-b border-gray-100">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="파일 검색..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        {/* 내용 */}
        <div className="divide-y divide-gray-100">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
            </div>
          ) : folders.length === 0 && filteredResources.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Folder size={48} className="mx-auto mb-4 text-gray-300" />
              <p>폴더나 파일이 없습니다.</p>
            </div>
          ) : (
            <>
              {/* 뒤로가기 */}
              {currentFolder && (
                <div
                  onClick={() => navigateToFolder(currentFolder.parent ? { id: currentFolder.parent } : null)}
                  className="p-4 hover:bg-gray-50 cursor-pointer flex items-center gap-4"
                >
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <ArrowLeft size={20} className="text-gray-500" />
                  </div>
                  <span className="text-gray-600">상위 폴더로</span>
                </div>
              )}

              {/* 폴더 */}
              {folders.map((folder) => (
                <div
                  key={`folder-${folder.id}`}
                  onClick={() => navigateToFolder(folder)}
                  className="p-4 hover:bg-gray-50 cursor-pointer flex items-center gap-4"
                >
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <Folder size={20} className="text-yellow-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{folder.name}</p>
                    <p className="text-sm text-gray-500">
                      폴더 {folder.subfolder_count || 0}개, 파일 {folder.resource_count || 0}개
                    </p>
                  </div>
                  <ChevronRight size={20} className="text-gray-400" />
                </div>
              ))}

              {/* 파일 */}
              {filteredResources.map((resource) => {
                const FileIcon = getFileIcon(resource.resource_type);
                return (
                  <div
                    key={`file-${resource.id}`}
                    className="p-4 hover:bg-gray-50 flex items-center gap-4"
                  >
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <FileIcon size={20} className="text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{resource.name}</p>
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        <span>{formatFileSize(resource.file_size)}</span>
                        <span className="flex items-center gap-1">
                          <Eye size={12} />
                          {resource.view_count}
                        </span>
                        <span className="flex items-center gap-1">
                          <Download size={12} />
                          {resource.download_count}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDownload(resource)}
                        className="p-2 hover:bg-blue-100 rounded-lg text-blue-600"
                        title="다운로드"
                      >
                        <Download size={18} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>

      {/* 새 폴더 모달 */}
      {showNewFolder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-semibold mb-4">새 폴더</h2>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="폴더 이름"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowNewFolder(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleCreateFolder}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                생성
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
