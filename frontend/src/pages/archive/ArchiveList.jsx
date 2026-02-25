// src/pages/archive/ArchiveList.jsx
import React, { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import ResourceService from "../../api/resources";
import {
  Folder,
  File,
  Upload,
  Download,
  Search,
  FolderPlus,
  ChevronRight,
  Image,
  FileText,
  Film,
  Archive as ArchiveIcon,
  MoreVertical,
  ArrowLeft,
  Edit3,
  Move,
  Trash2,
  X,
  ChevronDown,
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

// 날짜 포맷
const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date.toLocaleDateString("ko-KR");
};

export default function ArchiveList() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [folders, setFolders] = useState([]);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  
  // 컨텍스트 메뉴
  const [contextMenu, setContextMenu] = useState(null);
  
  // 이름변경 모달
  const [renameModal, setRenameModal] = useState(null);
  const [newName, setNewName] = useState("");
  
  // 이동 모달
  const [moveModal, setMoveModal] = useState(null);
  const [folderTree, setFolderTree] = useState([]);
  const [selectedMoveTarget, setSelectedMoveTarget] = useState(null);

  const dropRef = useRef(null);
  const folderId = searchParams.get("folder") || "";

  // 폴더 및 파일 로드
  const loadContents = useCallback(async () => {
    setLoading(true);
    try {
      if (folderId) {
        const res = await ResourceService.getFolderContents(folderId);
        setCurrentFolder(res.folder);
        setFolders(res.subfolders || []);
        setResources(res.resources || []);
      } else {
        const [foldersRes, filesRes] = await Promise.all([
          ResourceService.getFolders({ parent: "" }),
          ResourceService.getFiles({ folder: "" }),
        ]);
        setCurrentFolder(null);
        setFolders(foldersRes);
        setResources(filesRes);
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

  // 폴더 트리 로드 (이동용)
  const loadFolderTree = async () => {
    try {
      const tree = await ResourceService.getFolderTree();
      setFolderTree(tree);
    } catch (err) {
      console.error("Failed to load folder tree:", err);
    }
  };

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
      await ResourceService.createFolder({
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
  const handleFileUpload = async (files) => {
    if (!files.length) return;

    setUploading(true);
    setUploadProgress(0);
    
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append("file", file);
        formData.append("name", file.name);
        if (folderId) formData.append("folder", folderId);

        await ResourceService.uploadFile(formData, (progress) => {
          const totalProgress = ((i + progress / 100) / files.length) * 100;
          setUploadProgress(Math.round(totalProgress));
        });
      }
      loadContents();
    } catch (err) {
      console.error(err);
      alert("업로드 중 오류가 발생했습니다.");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // 드래그앤드롭 핸들러
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.target === dropRef.current) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files);
    }
  };

  // 파일 다운로드
  const handleDownload = async (resource) => {
    try {
      await ResourceService.downloadFile(resource.id, resource.name);
    } catch (err) {
      console.error(err);
      alert("다운로드 중 오류가 발생했습니다.");
    }
  };

  // 컨텍스트 메뉴 열기
  const openContextMenu = (e, item, type) => {
    e.preventDefault();
    e.stopPropagation();

    const MENU_WIDTH = 192; // w-48
    const MENU_ITEM_HEIGHT = 40;
    const MENU_PADDING = 8;
    const menuItemCount = 3;
    const menuHeight = menuItemCount * MENU_ITEM_HEIGHT + 12;
    const x = Math.max(
      MENU_PADDING,
      Math.min(e.clientX, window.innerWidth - MENU_WIDTH - MENU_PADDING)
    );
    const y = Math.max(
      MENU_PADDING,
      Math.min(e.clientY, window.innerHeight - menuHeight - MENU_PADDING)
    );

    setContextMenu({
      x,
      y,
      item,
      type,
    });
  };

  // 컨텍스트 메뉴 닫기
  const closeContextMenu = () => {
    setContextMenu(null);
  };

  // 이름변경
  const handleRename = async () => {
    if (!newName.trim() || !renameModal) return;

    try {
      if (renameModal.type === "folder") {
        await ResourceService.renameFolder(renameModal.item.id, newName);
      } else {
        await ResourceService.renameFile(renameModal.item.id, newName);
      }
      setRenameModal(null);
      setNewName("");
      loadContents();
    } catch (err) {
      console.error(err);
      alert("이름 변경 중 오류가 발생했습니다.");
    }
  };

  // 이동
  const handleMove = async () => {
    if (!moveModal) return;

    try {
      if (moveModal.type === "folder") {
        await ResourceService.moveFolder(moveModal.item.id, selectedMoveTarget);
      } else {
        await ResourceService.moveFile(moveModal.item.id, selectedMoveTarget);
      }
      setMoveModal(null);
      setSelectedMoveTarget(null);
      loadContents();
    } catch (err) {
      console.error(err);
      alert("이동 중 오류가 발생했습니다.");
    }
  };

  // 삭제
  const handleDelete = async (item, type) => {
    if (!window.confirm(`${item.name}을(를) 삭제하시겠습니까?`)) return;

    try {
      if (type === "folder") {
        await ResourceService.deleteFolder(item.id);
      } else {
        await ResourceService.deleteFile(item.id);
      }
      loadContents();
    } catch (err) {
      console.error(err);
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  // 정렬
  const sortItems = (items) => {
    return [...items].sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name, "ko");
          break;
        case "size":
          comparison = (a.file_size || 0) - (b.file_size || 0);
          break;
        case "date":
          comparison = new Date(a.created_at) - new Date(b.created_at);
          break;
        default:
          comparison = 0;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });
  };

  // 검색 필터
  const filteredFolders = folders.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredResources = sortItems(
    resources.filter((r) =>
      r.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  // 폴더 트리 렌더링
  const renderFolderTree = (items, level = 0) => {
    return items.map((folder) => (
      <div key={folder.id}>
        <div
          onClick={() => setSelectedMoveTarget(folder.id)}
          className={`py-2 px-3 cursor-pointer hover:bg-gray-100 rounded flex items-center gap-2 ${
            selectedMoveTarget === folder.id ? "bg-blue-100 text-blue-700" : ""
          }`}
          style={{ paddingLeft: `${level * 16 + 12}px` }}
        >
          <Folder size={16} className="text-yellow-600" />
          <span className="text-sm">{folder.name}</span>
        </div>
        {folder.children && renderFolderTree(folder.children, level + 1)}
      </div>
    ));
  };

  return (
    <div 
      className="space-y-6"
      onClick={closeContextMenu}
    >
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
            {uploading ? `업로드 중... ${uploadProgress}%` : "파일 업로드"}
            <input
              type="file"
              multiple
              onChange={(e) => handleFileUpload(Array.from(e.target.files))}
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

      {/* 드래그앤드롭 영역 */}
      <div
        ref={dropRef}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`bg-white rounded-xl border-2 border-dashed transition-colors ${
          isDragging 
            ? "border-blue-500 bg-blue-50" 
            : "border-gray-200"
        }`}
      >
        {isDragging && (
          <div className="p-12 text-center">
            <Upload size={48} className="mx-auto mb-4 text-blue-500" />
            <p className="text-lg font-medium text-blue-600">파일을 여기에 놓으세요</p>
          </div>
        )}

        {!isDragging && (
          <>
            {/* 검색 및 정렬 */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="파일 검색..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">정렬:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="name">이름</option>
                  <option value="date">등록일</option>
                  <option value="size">크기</option>
                </select>
                <button
                  onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <ChevronDown
                    size={16}
                    className={`transition-transform ${sortOrder === "desc" ? "rotate-180" : ""}`}
                  />
                </button>
              </div>
            </div>

            {/* 내용 */}
            <div className="divide-y divide-gray-100">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
                </div>
              ) : filteredFolders.length === 0 && filteredResources.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Folder size={48} className="mx-auto mb-4 text-gray-300" />
                  <p>폴더나 파일이 없습니다.</p>
                  <p className="text-sm mt-2">파일을 드래그하여 업로드하거나 위 버튼을 클릭하세요.</p>
                </div>
              ) : (
                <>
                  {/* 뒤로가기 */}
                  {currentFolder && (
                    <div
                      onClick={() =>
                        navigateToFolder(
                          currentFolder.parent ? { id: currentFolder.parent } : null
                        )
                      }
                      className="p-4 hover:bg-gray-50 cursor-pointer flex items-center gap-4"
                    >
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <ArrowLeft size={20} className="text-gray-500" />
                      </div>
                      <span className="text-gray-600">상위 폴더로</span>
                    </div>
                  )}

                  {/* 폴더 */}
                  {filteredFolders.map((folder) => (
                    <div
                      key={`folder-${folder.id}`}
                      onClick={() => navigateToFolder(folder)}
                      onContextMenu={(e) => openContextMenu(e, folder, "folder")}
                      className="p-4 hover:bg-gray-50 cursor-pointer flex items-center gap-4 group"
                    >
                      <div className="p-2 bg-yellow-100 rounded-lg">
                        <Folder size={20} className="text-yellow-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{folder.name}</p>
                        <p className="text-sm text-gray-500">
                          폴더 {folder.subfolder_count || 0}개, 파일{" "}
                          {folder.resource_count || 0}개
                        </p>
                      </div>
                      <button
                        onClick={(e) => openContextMenu(e, folder, "folder")}
                        className="p-2 opacity-0 group-hover:opacity-100 hover:bg-gray-200 rounded-lg"
                      >
                        <MoreVertical size={18} className="text-gray-500" />
                      </button>
                      <ChevronRight size={20} className="text-gray-400" />
                    </div>
                  ))}

                  {/* 파일 */}
                  {filteredResources.map((resource) => {
                    const FileIcon = getFileIcon(resource.resource_type);
                    return (
                      <div
                        key={`file-${resource.id}`}
                        onContextMenu={(e) => openContextMenu(e, resource, "file")}
                        className="p-4 hover:bg-gray-50 flex items-center gap-4 group"
                      >
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <FileIcon size={20} className="text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {resource.name}
                          </p>
                          <div className="flex items-center gap-3 text-sm text-gray-500">
                            <span>{formatFileSize(resource.file_size)}</span>
                            <span>{formatDate(resource.created_at)}</span>
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
                          <button
                            onClick={(e) => openContextMenu(e, resource, "file")}
                            className="p-2 opacity-0 group-hover:opacity-100 hover:bg-gray-200 rounded-lg"
                          >
                            <MoreVertical size={18} className="text-gray-500" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* 컨텍스트 메뉴 */}
      {contextMenu && (
        <div
          className="fixed w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-50"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button
            onClick={() => {
              setRenameModal(contextMenu);
              setNewName(contextMenu.item.name);
              closeContextMenu();
            }}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 whitespace-nowrap"
          >
            <Edit3 size={16} />
            이름 변경
          </button>
          <button
            onClick={() => {
              setMoveModal(contextMenu);
              loadFolderTree();
              closeContextMenu();
            }}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 whitespace-nowrap"
          >
            <Move size={16} />
            이동
          </button>
          <hr className="my-1" />
          <button
            onClick={() => {
              handleDelete(contextMenu.item, contextMenu.type);
              closeContextMenu();
            }}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 text-red-600 whitespace-nowrap"
          >
            <Trash2 size={16} />
            삭제
          </button>
        </div>
      )}

      {/* 새 폴더 모달 */}
      {showNewFolder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">새 폴더</h2>
              <button onClick={() => setShowNewFolder(false)}>
                <X size={20} className="text-gray-500" />
              </button>
            </div>
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

      {/* 이름변경 모달 */}
      {renameModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">이름 변경</h2>
              <button onClick={() => setRenameModal(null)}>
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="새 이름"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => setRenameModal(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleRename}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                변경
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 이동 모달 */}
      {moveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">이동할 폴더 선택</h2>
              <button onClick={() => setMoveModal(null)}>
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg mb-4">
              <div
                onClick={() => setSelectedMoveTarget(null)}
                className={`py-2 px-3 cursor-pointer hover:bg-gray-100 rounded flex items-center gap-2 ${
                  selectedMoveTarget === null ? "bg-blue-100 text-blue-700" : ""
                }`}
              >
                <Folder size={16} className="text-yellow-600" />
                <span className="text-sm">루트 폴더</span>
              </div>
              {renderFolderTree(folderTree)}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setMoveModal(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleMove}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                이동
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
