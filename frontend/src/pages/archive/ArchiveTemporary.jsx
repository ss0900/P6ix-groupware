// src/pages/archive/ArchiveTemporary.jsx
import React, { useEffect, useState, useCallback } from "react";
import ResourceService from "../../api/resources";
import {
  Clock,
  Download,
  Trash2,
  File,
  Image,
  FileText,
  Film,
  Archive as ArchiveIcon,
  AlertCircle,
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

// 남은 시간 계산
const getTimeRemaining = (expiresAt) => {
  if (!expiresAt) return "만료일 없음";
  const now = new Date();
  const expires = new Date(expiresAt);
  const diff = expires - now;
  
  if (diff <= 0) return "만료됨";
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  if (days > 0) return `${days}일 ${hours}시간 남음`;
  return `${hours}시간 남음`;
};

export default function ArchiveTemporary() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadTemporaryFiles = useCallback(async () => {
    setLoading(true);
    try {
      const data = await ResourceService.getFiles({ temporary: "true" });
      setFiles(data);
    } catch (err) {
      console.error("Failed to load temporary files:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemporaryFiles();
  }, [loadTemporaryFiles]);

  // 다운로드
  const handleDownload = async (file) => {
    try {
      await ResourceService.downloadFile(file.id, file.name);
    } catch (err) {
      console.error(err);
      alert("다운로드 중 오류가 발생했습니다.");
    }
  };

  // 삭제
  const handleDelete = async (file) => {
    if (!window.confirm(`${file.name}을(를) 삭제하시겠습니까?`)) return;
    
    try {
      await ResourceService.deleteFile(file.id);
      loadTemporaryFiles();
    } catch (err) {
      console.error(err);
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Clock className="text-gray-500" size={24} />
          <h1 className="text-2xl font-bold text-gray-900">임시파일</h1>
        </div>
      </div>

      {/* 안내 */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle className="text-amber-600 flex-shrink-0" size={20} />
        <div className="text-sm text-amber-800">
          <p className="font-medium mb-1">임시파일 안내</p>
          <p>임시파일은 만료일이 지나면 자동으로 삭제됩니다. 필요한 파일은 자료실로 이동해 주세요.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        {/* 테이블 헤더 */}
        <div className="p-4 border-b border-gray-100 grid grid-cols-12 gap-4 text-sm font-medium text-gray-500">
          <div className="col-span-4">파일명</div>
          <div className="col-span-2">크기</div>
          <div className="col-span-2">등록일</div>
          <div className="col-span-2">만료까지</div>
          <div className="col-span-2 text-center">작업</div>
        </div>

        {/* 내용 */}
        <div className="divide-y divide-gray-100">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Clock size={48} className="mx-auto mb-4 text-gray-300" />
              <p>임시파일이 없습니다.</p>
            </div>
          ) : (
            files.map((file) => {
              const FileIcon = getFileIcon(file.resource_type);
              const timeRemaining = getTimeRemaining(file.expires_at);
              const isExpiring = timeRemaining.includes("시간") || timeRemaining === "만료됨";

              return (
                <div
                  key={file.id}
                  className="p-4 hover:bg-gray-50 grid grid-cols-12 gap-4 items-center"
                >
                  {/* 파일명 */}
                  <div className="col-span-4 flex items-center gap-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <FileIcon size={20} className="text-gray-600" />
                    </div>
                    <span className="font-medium text-gray-900 truncate">{file.name}</span>
                  </div>

                  {/* 크기 */}
                  <div className="col-span-2 text-sm text-gray-500">
                    {formatFileSize(file.file_size)}
                  </div>

                  {/* 등록일 */}
                  <div className="col-span-2 text-sm text-gray-500">
                    {formatDate(file.created_at)}
                  </div>

                  {/* 만료까지 */}
                  <div className="col-span-2">
                    <span className={`text-sm ${isExpiring ? "text-red-600 font-medium" : "text-gray-500"}`}>
                      {timeRemaining}
                    </span>
                  </div>

                  {/* 작업 */}
                  <div className="col-span-2 flex items-center justify-center gap-2">
                    <button
                      onClick={() => handleDownload(file)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                      title="다운로드"
                    >
                      <Download size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(file)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      title="삭제"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
