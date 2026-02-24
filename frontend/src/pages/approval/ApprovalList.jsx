// src/pages/approval/ApprovalList.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../../api/axios";
import {
  FileEdit,
  Search,
  ChevronLeft,
  ChevronRight,
  Paperclip,
  Eye,
  EyeOff,
  CheckSquare,
  Square,
  FileText,
} from "lucide-react";

// 경로별 필터 매핑
const FILTER_MAP = {
  draft: { filter: "draft", title: "임시보관함" },
  "in-progress": { filter: "in_progress", title: "진행중" },
  completed: { filter: "completed", title: "완료" },
  reference: { filter: "reference", title: "참조" },
  sent: { filter: "sent", title: "기안" },
  all: { filter: "all_view", title: "전체보기" },
  public: { filter: "public", title: "내 공문" },
};

// 상태 뱃지
const StatusBadge = ({ status }) => {
  const styles = {
    draft: "bg-gray-100 text-gray-600",
    pending: "bg-blue-100 text-blue-600",
    approved: "bg-green-100 text-green-600",
    rejected: "bg-red-100 text-red-600",
    canceled: "bg-gray-100 text-gray-500",
  };

  const labels = {
    draft: "임시저장",
    pending: "진행중",
    approved: "승인",
    rejected: "반려",
    canceled: "취소",
  };

  return (
    <span
      className={`px-2 py-0.5 text-xs rounded-full ${
        styles[status] || styles.draft
      }`}
    >
      {labels[status] || status}
    </span>
  );
};

export default function ApprovalList() {
  const navigate = useNavigate();
  const location = useLocation();

  // 현재 경로에서 필터 타입 파악
  const pathParts = location.pathname.split("/").filter(Boolean);
  const currentPath = pathParts.length > 1 ? pathParts[1] : "all";
  const filterConfig = FILTER_MAP[currentPath] || FILTER_MAP["all"];
  const isDraftPage = currentPath === "draft";

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusTab, setStatusTab] = useState("all"); // all, approved, rejected
  const [readFilter, setReadFilter] = useState("all"); // all, read, unread
  const [selectedIds, setSelectedIds] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const getDocumentNavigatePath = useCallback(
    (docId) => {
      if (isDraftPage) return `/approval/${docId}/edit`;
      return `/approval/${docId}?filter=${filterConfig.filter}`;
    },
    [isDraftPage, filterConfig.filter],
  );

  // 문서 목록 로드
  const loadDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        filter: filterConfig.filter,
        page,
      };
      if (searchQuery) params.search = searchQuery;
      if (statusTab !== "all" && currentPath === "completed") {
        params.status = statusTab;
      }
      if (readFilter !== "all") {
        params.is_read = readFilter === "read";
      }

      const res = await api.get("/approval/documents/", { params });
      const data = res.data;

      if (data.results) {
        setDocuments(data.results);
        setTotalPages(Math.ceil((data.count || data.results.length) / 20));
      } else {
        setDocuments(Array.isArray(data) ? data : []);
        setTotalPages(1);
      }
    } catch (err) {
      console.error("Failed to load documents:", err);
    } finally {
      setLoading(false);
    }
  }, [
    filterConfig.filter,
    page,
    searchQuery,
    statusTab,
    readFilter,
    currentPath,
  ]);

  useEffect(() => {
    loadDocuments();
    setSelectedIds([]);
  }, [loadDocuments]);

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === documents.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(documents.map((d) => d.id));
    }
  };

  const handleBulkReadUpdate = async (isRead) => {
    if (selectedIds.length === 0) return;
    try {
      await api.post("/approval/documents/bulk_read/", {
        document_ids: selectedIds,
        is_read: isRead,
      });
      setSelectedIds([]);
      await loadDocuments();
    } catch (err) {
      console.error("Bulk read status update failed:", err);
      alert("읽음 상태 변경 중 오류가 발생했습니다.");
    }
  };

  // 날짜 포맷
  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr)
      .toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
      .replace(/\. /g, "-")
      .replace(".", "");
  };

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          {filterConfig.title}
        </h1>
        <button
          onClick={() => navigate("/approval/new")}
          className="flex items-center gap-2 px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors"
        >
          <FileEdit size={18} />
          문서 작성
        </button>
      </div>

      {/* 검색 및 필터 바 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <div className="flex items-center gap-4 flex-wrap">
          {selectedIds.length > 0 ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                선택 {selectedIds.length}건
              </span>
              <button
                onClick={() => handleBulkReadUpdate(true)}
                className="px-3 py-1.5 rounded-lg text-sm text-sky-700 bg-sky-100 border border-sky-300 hover:bg-sky-200 transition-colors"
              >
                읽음처리
              </button>
              <button
                onClick={() => handleBulkReadUpdate(false)}
                className="px-3 py-1.5 rounded-lg text-sm text-gray-700 bg-gray-100 border border-gray-300 hover:bg-gray-200 transition-colors"
              >
                안읽음처리
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setReadFilter("all")}
                className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 transition-colors ${
                  readFilter === "all"
                    ? "bg-sky-100 text-sky-700 border border-sky-300"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                전체
              </button>
              <button
                onClick={() => setReadFilter("read")}
                className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 transition-colors ${
                  readFilter === "read"
                    ? "bg-sky-100 text-sky-700 border border-sky-300"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <Eye size={14} />
                읽음
              </button>
              <button
                onClick={() => setReadFilter("unread")}
                className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 transition-colors ${
                  readFilter === "unread"
                    ? "bg-sky-100 text-sky-700 border border-sky-300"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <EyeOff size={14} />
                안읽음
              </button>
            </div>
          )}

          {/* 검색 */}
          <div className="relative flex-1 max-w-md">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="제목, 문서번호, 상신자 검색..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
            />
          </div>

          {/* 상태 탭 (완료 페이지에서만, 검색창과 같은 줄 우측 정렬) */}
          {currentPath === "completed" && (
            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={() => setStatusTab("all")}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  statusTab === "all"
                    ? "bg-sky-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                전체
              </button>
              <button
                onClick={() => setStatusTab("approved")}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  statusTab === "approved"
                    ? "bg-green-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                승인
              </button>
              <button
                onClick={() => setStatusTab("rejected")}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  statusTab === "rejected"
                    ? "bg-red-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                반려
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 문서 목록 테이블 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* 테이블 헤더 */}
        <div className="flex items-center px-4 py-3 bg-gray-50 border-b border-gray-200 text-sm text-gray-600 font-medium">
          <div className="w-10 flex justify-center">
            <button
              onClick={toggleSelectAll}
              className="text-gray-400 hover:text-gray-600"
            >
              {selectedIds.length === documents.length &&
              documents.length > 0 ? (
                <CheckSquare size={18} />
              ) : (
                <Square size={18} />
              )}
            </button>
          </div>
          <div className="w-24 text-center">번호</div>
          <div className="flex-1">제목</div>
          <div className="w-10 text-center">
            <Paperclip size={14} className="inline text-gray-400" />
          </div>
          {isDraftPage ? (
            <div className="w-32 text-center">작성일</div>
          ) : (
            <>
              <div className="w-24 text-center">문서번호</div>
              <div className="w-20 text-center">상신자</div>
              <div className="w-32 text-center">상신일</div>
              <div className="w-24 text-center">최종결재자</div>
              <div className="w-20 text-center">상태</div>
            </>
          )}
        </div>

        {/* 문서 목록 */}
        <div className="divide-y divide-gray-100">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-sky-500 border-t-transparent"></div>
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText size={48} className="mx-auto mb-4 text-gray-300" />
              <p>문서가 없습니다.</p>
            </div>
          ) : (
            documents.map((doc) => (
              <div
                key={doc.id}
                onClick={() => navigate(getDocumentNavigatePath(doc.id))}
                className={`flex items-center px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors ${
                  selectedIds.includes(doc.id) ? "bg-sky-50" : ""
                } ${
                  !doc.is_read ? "font-medium" : ""
                }`}
              >
                {/* 체크박스 */}
                <div className="w-10 flex justify-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelect(doc.id);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    {selectedIds.includes(doc.id) ? (
                      <CheckSquare size={18} className="text-sky-500" />
                    ) : (
                      <Square size={18} />
                    )}
                  </button>
                </div>

                {/* 번호 */}
                <div className="w-24 text-center text-sm text-gray-500">
                  {doc.id}
                </div>

                {/* 제목 */}
                <div className="flex-1 truncate">
                  {doc.template_name && (
                    <span className="text-sky-600 mr-1">
                      [{doc.template_name}]
                    </span>
                  )}
                  <span className="text-gray-900">{doc.title}</span>
                </div>

                {/* 첨부 */}
                <div className="w-10 text-center">
                  {doc.attachment_count > 0 && (
                    <Paperclip size={14} className="inline text-gray-400" />
                  )}
                </div>

                {isDraftPage ? (
                  <div className="w-32 text-center text-xs text-gray-500">
                    {formatDate(doc.drafted_at)}
                  </div>
                ) : (
                  <>
                    {/* 문서번호 */}
                    <div className="w-24 text-center text-xs text-gray-500">
                      {doc.document_number || "-"}
                    </div>

                    {/* 상신자 */}
                    <div className="w-20 text-center text-sm text-gray-600 truncate">
                      {doc.author_name}
                    </div>

                    {/* 상신일 */}
                    <div className="w-32 text-center text-xs text-gray-500">
                      {formatDate(doc.submitted_at || doc.drafted_at)}
                    </div>

                    {/* 최종결재자 */}
                    <div className="w-24 text-center text-sm text-gray-600 truncate">
                      {doc.final_approver_name || "-"}
                    </div>

                    {/* 상태 */}
                    <div className="w-20 text-center">
                      <StatusBadge status={doc.status} />
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 py-4 border-t border-gray-200">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={18} />
            </button>

            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`w-8 h-8 rounded-lg text-sm ${
                    page === pageNum
                      ? "bg-sky-500 text-white"
                      : "hover:bg-gray-100 text-gray-600"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
