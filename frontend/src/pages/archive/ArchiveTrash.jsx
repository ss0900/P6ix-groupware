// src/pages/archive/ArchiveTrash.jsx
import React, { useEffect, useState, useCallback } from "react";
import ResourceService from "../../api/resources";
import {
  Trash2,
  RotateCcw,
  Folder,
  File,
  Image,
  FileText,
  Film,
  Archive as ArchiveIcon,
  AlertTriangle,
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

// 시간 포맷
const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function ArchiveTrash() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState([]);
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);
  const [itemToPurge, setItemToPurge] = useState(null);

  const loadTrash = useCallback(async () => {
    setLoading(true);
    try {
      const data = await ResourceService.getTrash();
      setItems(data);
    } catch (err) {
      console.error("Failed to load trash:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTrash();
  }, [loadTrash]);

  // 복원
  const handleRestore = async (item) => {
    try {
      await ResourceService.restoreItem(item.id, item.type);
      loadTrash();
    } catch (err) {
      console.error(err);
      alert("복원 중 오류가 발생했습니다.");
    }
  };

  // 영구 삭제
  const handlePurge = async () => {
    if (!itemToPurge) return;
    
    try {
      await ResourceService.purgeItem(itemToPurge.id, itemToPurge.type);
      setShowPurgeConfirm(false);
      setItemToPurge(null);
      loadTrash();
    } catch (err) {
      console.error(err);
      alert("영구 삭제 중 오류가 발생했습니다.");
    }
  };

  const confirmPurge = (item) => {
    setItemToPurge(item);
    setShowPurgeConfirm(true);
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Trash2 className="text-gray-500" size={24} />
          <h1 className="text-2xl font-bold text-gray-900">휴지통</h1>
        </div>
        <p className="text-sm text-gray-500">
          휴지통의 항목은 30일 후 자동으로 영구 삭제됩니다.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        {/* 테이블 헤더 */}
        <div className="p-4 border-b border-gray-100 grid grid-cols-12 gap-4 text-sm font-medium text-gray-500">
          <div className="col-span-5">이름</div>
          <div className="col-span-2">유형</div>
          <div className="col-span-2">삭제일</div>
          <div className="col-span-1">크기</div>
          <div className="col-span-2 text-center">작업</div>
        </div>

        {/* 내용 */}
        <div className="divide-y divide-gray-100">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Trash2 size={48} className="mx-auto mb-4 text-gray-300" />
              <p>휴지통이 비어 있습니다.</p>
            </div>
          ) : (
            items.map((item) => {
              const Icon = item.type === "folder" ? Folder : getFileIcon(item.resource_type);
              const iconBg = item.type === "folder" ? "bg-yellow-100" : "bg-blue-100";
              const iconColor = item.type === "folder" ? "text-yellow-600" : "text-blue-600";

              return (
                <div
                  key={`${item.type}-${item.id}`}
                  className="p-4 hover:bg-gray-50 grid grid-cols-12 gap-4 items-center"
                >
                  {/* 이름 */}
                  <div className="col-span-5 flex items-center gap-3">
                    <div className={`p-2 ${iconBg} rounded-lg`}>
                      <Icon size={20} className={iconColor} />
                    </div>
                    <span className="font-medium text-gray-900 truncate">{item.name}</span>
                  </div>

                  {/* 유형 */}
                  <div className="col-span-2 text-sm text-gray-500">
                    {item.type === "folder" ? "폴더" : "파일"}
                  </div>

                  {/* 삭제일 */}
                  <div className="col-span-2 text-sm text-gray-500">
                    {formatDate(item.deleted_at)}
                  </div>

                  {/* 크기 */}
                  <div className="col-span-1 text-sm text-gray-500">
                    {item.type === "file" ? formatFileSize(item.size) : "-"}
                  </div>

                  {/* 작업 */}
                  <div className="col-span-2 flex items-center justify-center gap-2">
                    <button
                      onClick={() => handleRestore(item)}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg"
                      title="복원"
                    >
                      <RotateCcw size={16} />
                      복원
                    </button>
                    <button
                      onClick={() => confirmPurge(item)}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg"
                      title="영구삭제"
                    >
                      <Trash2 size={16} />
                      삭제
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 영구 삭제 확인 모달 */}
      {showPurgeConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4 text-red-600">
              <AlertTriangle size={24} />
              <h2 className="text-lg font-semibold">영구 삭제 확인</h2>
            </div>
            <p className="text-gray-600 mb-6">
              <strong>{itemToPurge?.name}</strong>을(를) 영구 삭제하시겠습니까?
              <br />
              <span className="text-sm text-red-500">이 작업은 되돌릴 수 없습니다.</span>
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowPurgeConfirm(false);
                  setItemToPurge(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handlePurge}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                영구 삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
