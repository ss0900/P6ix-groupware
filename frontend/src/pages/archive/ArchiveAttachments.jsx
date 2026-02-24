// src/pages/archive/ArchiveAttachments.jsx
import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import ResourceService from "../../api/resources";
import {
  Paperclip,
  Download,
  ExternalLink,
  File,
  Image,
  FileText,
  Film,
  Archive as ArchiveIcon,
  Mail,
  MessageSquare,
  FileCheck,
  Calendar,
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

// 출처 유형 아이콘 및 라벨
const getSourceInfo = (sourceType) => {
  const sources = {
    contact: { icon: Mail, label: "업무연락", color: "text-blue-600", bg: "bg-blue-100" },
    board: { icon: MessageSquare, label: "게시판", color: "text-green-600", bg: "bg-green-100" },
    approval: { icon: FileCheck, label: "전자결재", color: "text-purple-600", bg: "bg-purple-100" },
    chat: { icon: MessageSquare, label: "메신저", color: "text-orange-600", bg: "bg-orange-100" },
    meeting: { icon: Calendar, label: "회의", color: "text-indigo-600", bg: "bg-indigo-100" },
  };
  return sources[sourceType] || { icon: File, label: sourceType, color: "text-gray-600", bg: "bg-gray-100" };
};

// 출처 페이지 링크
const getSourceLink = (sourceType, sourceId) => {
  const links = {
    contact: `/contact/${sourceId}`,
    board: `/board/view/${sourceId}`,
    approval: `/approval/${sourceId}`,
    meeting: `/schedule/${sourceId}`,
  };
  return links[sourceType] || "#";
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
  return date.toLocaleDateString("ko-KR");
};

export default function ArchiveAttachments() {
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState("all");

  const tabs = [
    { id: "all", label: "전체" },
    { id: "contact", label: "업무연락" },
    { id: "board", label: "게시판" },
    { id: "approval", label: "전자결재" },
    { id: "chat", label: "메신저" },
  ];

  const loadAttachments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await ResourceService.getMyAttachments();
      setAttachments(data);
    } catch (err) {
      console.error("Failed to load attachments:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAttachments();
  }, [loadAttachments]);

  // 탭 필터
  const filteredAttachments = selectedTab === "all"
    ? attachments
    : attachments.filter((a) => a.source_type === selectedTab);

  // 다운로드
  const handleDownload = async (attachment) => {
    try {
      await ResourceService.downloadFile(attachment.document, attachment.document_name);
    } catch (err) {
      console.error(err);
      alert("다운로드 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <Paperclip className="text-gray-500" size={24} />
        <h1 className="text-2xl font-bold text-gray-900">첨부파일</h1>
      </div>

      {/* 탭 */}
      <div className="flex gap-2 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              selectedTab === tab.id
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        {/* 테이블 헤더 */}
        <div className="p-4 border-b border-gray-100 grid grid-cols-12 gap-4 text-sm font-medium text-gray-500">
          <div className="col-span-4">파일명</div>
          <div className="col-span-2">출처</div>
          <div className="col-span-3">제목</div>
          <div className="col-span-1">크기</div>
          <div className="col-span-2 text-center">작업</div>
        </div>

        {/* 내용 */}
        <div className="divide-y divide-gray-100">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
            </div>
          ) : filteredAttachments.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Paperclip size={48} className="mx-auto mb-4 text-gray-300" />
              <p>첨부파일이 없습니다.</p>
            </div>
          ) : (
            filteredAttachments.map((attachment) => {
              const FileIcon = getFileIcon(attachment.document_type);
              const sourceInfo = getSourceInfo(attachment.source_type);
              const SourceIcon = sourceInfo.icon;

              return (
                <div
                  key={attachment.id}
                  className="p-4 hover:bg-gray-50 grid grid-cols-12 gap-4 items-center"
                >
                  {/* 파일명 */}
                  <div className="col-span-4 flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <FileIcon size={20} className="text-blue-600" />
                    </div>
                    <span className="font-medium text-gray-900 truncate">
                      {attachment.document_name}
                    </span>
                  </div>

                  {/* 출처 */}
                  <div className="col-span-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${sourceInfo.bg} ${sourceInfo.color}`}>
                      <SourceIcon size={12} />
                      {sourceInfo.label}
                    </span>
                  </div>

                  {/* 제목 */}
                  <div className="col-span-3 text-sm text-gray-600 truncate">
                    {attachment.source_title || "-"}
                  </div>

                  {/* 크기 */}
                  <div className="col-span-1 text-sm text-gray-500">
                    {formatFileSize(attachment.document_size)}
                  </div>

                  {/* 작업 */}
                  <div className="col-span-2 flex items-center justify-center gap-2">
                    <button
                      onClick={() => handleDownload(attachment)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                      title="다운로드"
                    >
                      <Download size={18} />
                    </button>
                    <Link
                      to={getSourceLink(attachment.source_type, attachment.source_id)}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                      title="원본 보기"
                    >
                      <ExternalLink size={18} />
                    </Link>
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
