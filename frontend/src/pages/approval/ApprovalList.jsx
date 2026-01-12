// src/pages/approval/ApprovalList.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../../api/axios";
import { 
  FileCheck, 
  Send, 
  Inbox, 
  CheckCircle, 
  Clock, 
  Plus,
  Search,
  Filter,
  RefreshCw
} from "lucide-react";

// 탭 설정
const TABS = [
  { id: "pending", label: "결재 대기", icon: Clock, color: "text-orange-600" },
  { id: "sent", label: "기안 문서", icon: Send, color: "text-blue-600" },
  { id: "approved", label: "결재 완료", icon: CheckCircle, color: "text-green-600" },
  { id: "draft", label: "임시 저장", icon: FileCheck, color: "text-gray-600" },
];

// 상태 뱃지
const StatusBadge = ({ status }) => {
  const styles = {
    draft: "bg-gray-100 text-gray-600",
    pending: "bg-yellow-100 text-yellow-700",
    approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
    canceled: "bg-gray-100 text-gray-500",
  };

  const labels = {
    draft: "임시저장",
    pending: "결재중",
    approved: "승인",
    rejected: "반려",
    canceled: "취소",
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.draft}`}>
      {labels[status] || status}
    </span>
  );
};

// 우선순위 뱃지
const PriorityBadge = ({ priority }) => {
  if (priority === "normal") return null;

  const styles = {
    urgent: "bg-red-500 text-white",
    important: "bg-orange-500 text-white",
  };

  const labels = {
    urgent: "긴급",
    important: "중요",
  };

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[priority]}`}>
      {labels[priority]}
    </span>
  );
};

export default function ApprovalList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ pending: 0, draft: 0, sent: 0 });
  const [searchQuery, setSearchQuery] = useState("");

  const currentTab = searchParams.get("filter") || "pending";

  // 통계 로드
  const loadStats = useCallback(async () => {
    try {
      const res = await api.get("approval/documents/stats/");
      setStats(res.data);
    } catch (err) {
      console.error("Failed to load stats:", err);
    }
  }, []);

  // 문서 목록 로드
  const loadDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`approval/documents/?filter=${currentTab}`);
      let list = res.data?.results ?? res.data ?? [];

      // 검색 필터
      if (searchQuery.trim()) {
        list = list.filter((doc) =>
          doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          doc.author_name.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      setDocuments(list);
    } catch (err) {
      console.error("Failed to load documents:", err);
    } finally {
      setLoading(false);
    }
  }, [currentTab, searchQuery]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // 탭 변경
  const handleTabChange = (tabId) => {
    setSearchParams({ filter: tabId });
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">전자결재</h1>
        <button
          onClick={() => navigate("/approval/new")}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={18} />
          새 기안
        </button>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-3 gap-4">
        <div 
          className="bg-white rounded-xl border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => handleTabChange("pending")}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">결재 대기</p>
              <p className="text-2xl font-bold text-orange-600">{stats.pending}</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <Clock size={24} className="text-orange-600" />
            </div>
          </div>
        </div>
        <div 
          className="bg-white rounded-xl border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => handleTabChange("sent")}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">기안 문서</p>
              <p className="text-2xl font-bold text-blue-600">{stats.sent}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Send size={24} className="text-blue-600" />
            </div>
          </div>
        </div>
        <div 
          className="bg-white rounded-xl border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => handleTabChange("draft")}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">임시 저장</p>
              <p className="text-2xl font-bold text-gray-600">{stats.draft}</p>
            </div>
            <div className="p-3 bg-gray-100 rounded-lg">
              <FileCheck size={24} className="text-gray-600" />
            </div>
          </div>
        </div>
      </div>

      {/* 탭 + 검색 */}
      <div className="bg-white rounded-xl border border-gray-200">
        {/* 탭 */}
        <div className="flex border-b border-gray-200">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
                currentTab === tab.id
                  ? `${tab.color} border-current`
                  : "text-gray-500 border-transparent hover:text-gray-700"
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
              {tab.id === "pending" && stats.pending > 0 && (
                <span className="px-1.5 py-0.5 bg-orange-500 text-white text-xs rounded-full">
                  {stats.pending}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* 검색 바 */}
        <div className="p-4 border-b border-gray-100 flex items-center gap-4">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="제목, 기안자 검색..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <button
            onClick={loadDocuments}
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"
            title="새로고침"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {/* 문서 목록 */}
        <div className="divide-y divide-gray-100">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Inbox size={48} className="mx-auto mb-4 text-gray-300" />
              <p>문서가 없습니다.</p>
            </div>
          ) : (
            documents.map((doc) => (
              <div
                key={doc.id}
                onClick={() => navigate(`/approval/${doc.id}`)}
                className="p-4 hover:bg-gray-50 cursor-pointer transition-colors flex items-center gap-4"
              >
                {/* 아이콘 */}
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileCheck size={20} className="text-blue-600" />
                </div>

                {/* 정보 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <PriorityBadge priority={doc.priority} />
                    <span className="font-medium text-gray-900 truncate">{doc.title}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    <span>{doc.author_name}</span>
                    <span>•</span>
                    <span>{doc.template_name || "일반 문서"}</span>
                    {doc.current_approver_name && (
                      <>
                        <span>•</span>
                        <span className="text-orange-600">현재: {doc.current_approver_name}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* 상태 & 날짜 */}
                <div className="text-right">
                  <StatusBadge status={doc.status} />
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(doc.drafted_at).toLocaleDateString('ko-KR')}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
