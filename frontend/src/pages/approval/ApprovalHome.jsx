// src/pages/approval/ApprovalHome.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import {
  FileEdit,
  Clock,
  CheckCircle,
  FileText,
  ChevronRight,
  Paperclip,
} from "lucide-react";
import ApprovalStamp from "./components/ApprovalStamp";

export default function ApprovalHome() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({});
  const [pendingDocs, setPendingDocs] = useState([]);
  const [completedDocs, setCompletedDocs] = useState([]);
  const [loading, setLoading] = useState(true);

  // 통계 및 문서 목록 로드
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, pendingRes, completedRes] = await Promise.all([
        api.get("/approval/documents/stats/"),
        api.get("/approval/documents/", { params: { filter: "my_pending" } }),
        api.get("/approval/documents/", { params: { filter: "my_completed" } }),
      ]);
      setStats(statsRes.data);
      setPendingDocs(pendingRes.data?.results ?? pendingRes.data ?? []);
      setCompletedDocs((completedRes.data?.results ?? completedRes.data ?? []).slice(0, 5));
    } catch (err) {
      console.error("Failed to load approval data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 날짜 포맷
  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).replace(/\. /g, "-").replace(".", "");
  };

  // 문서 카드 컴포넌트
  const DocumentCard = ({ doc }) => (
    <div
      className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => navigate(`/approval/${doc.id}`)}
    >
      {/* 제목 및 날짜 */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 truncate">{doc.title}</h3>
          <p className="text-xs text-gray-500 mt-1">
            {doc.template_name && <span className="text-sky-600">[{doc.template_name}]</span>}
            {doc.author_name} {doc.author_position}
          </p>
        </div>
        <div className="text-xs text-gray-400 ml-2 whitespace-nowrap">
          {formatDate(doc.submitted_at || doc.drafted_at)}
        </div>
      </div>

      {/* 결재선 (도장 스타일) */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {doc.approval_lines?.map((line, idx) => (
          <React.Fragment key={line.id}>
            <ApprovalStamp
              status={line.status}
              approver={{
                name: line.approver_name,
                position: line.approver_position,
              }}
              actedAt={line.acted_at}
              order={idx + 1}
              size="sm"
            />
            {idx < doc.approval_lines.length - 1 && (
              <ChevronRight size={14} className="text-gray-300 flex-shrink-0" />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* 첨부파일 표시 */}
      {doc.attachment_count > 0 && (
        <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
          <Paperclip size={12} />
          <span>{doc.attachment_count}</span>
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-sky-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">전자결재</h1>
        <button
          onClick={() => navigate("/approval/new")}
          className="flex items-center gap-2 px-5 py-2.5 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors shadow-sm"
        >
          <FileEdit size={18} />
          문서 작성
        </button>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => navigate("/approval/in-progress")}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Clock className="text-blue-500" size={20} />
            </div>
            <div>
              <p className="text-xs text-gray-500">결재 대기</p>
              <p className="text-xl font-bold text-gray-900">{stats.my_pending || 0}</p>
            </div>
          </div>
        </div>

        <div
          className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => navigate("/approval/sent")}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
              <FileText className="text-purple-500" size={20} />
            </div>
            <div>
              <p className="text-xs text-gray-500">기안 문서</p>
              <p className="text-xl font-bold text-gray-900">{stats.sent_pending || 0}</p>
            </div>
          </div>
        </div>

        <div
          className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => navigate("/approval/completed")}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
              <CheckCircle className="text-green-500" size={20} />
            </div>
            <div>
              <p className="text-xs text-gray-500">결재 완료</p>
              <p className="text-xl font-bold text-gray-900">{stats.completed || 0}</p>
            </div>
          </div>
        </div>

        <div
          className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => navigate("/approval/draft")}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center">
              <FileEdit className="text-gray-500" size={20} />
            </div>
            <div>
              <p className="text-xs text-gray-500">임시저장</p>
              <p className="text-xl font-bold text-gray-900">{stats.draft || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 결재할 문서 섹션 */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Clock size={18} className="text-blue-500" />
          <h2 className="text-lg font-semibold text-gray-900">결재할 문서</h2>
          <span className="text-sm text-gray-500">({pendingDocs.length})</span>
        </div>

        {pendingDocs.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <FileText size={48} className="mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500">결재할 문서가 없습니다.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {pendingDocs.map((doc) => (
              <DocumentCard key={doc.id} doc={doc} />
            ))}
          </div>
        )}
      </div>

      {/* 결재한 문서 섹션 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle size={18} className="text-green-500" />
            <h2 className="text-lg font-semibold text-gray-900">결재한 문서</h2>
          </div>
          <button
            onClick={() => navigate("/approval/completed")}
            className="text-sm text-sky-600 hover:text-sky-700"
          >
            전체보기 →
          </button>
        </div>

        {completedDocs.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <FileText size={48} className="mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500">결재한 문서가 없습니다.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {completedDocs.map((doc) => (
              <DocumentCard key={doc.id} doc={doc} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
