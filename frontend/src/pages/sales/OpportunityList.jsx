// src/pages/sales/OpportunityList.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { opportunityApi } from "../../api/salesApi";
import { useUrlFilter } from "../../hooks/useUrlFilter";
import useResponsiveView from "../../hooks/useResponsiveView";
import { Plus, Search, TrendingUp, AlertCircle, LayoutGrid, List } from "lucide-react";

// 숫자 포맷
const formatCurrency = (value) => {
  if (!value) return "₩0";
  return `₩${Number(value).toLocaleString()}`;
};

// 상태 뱃지
const StatusBadge = ({ status }) => {
  const config = {
    lead: { bg: "bg-gray-100", text: "text-gray-600", label: "리드" },
    contact: { bg: "bg-blue-100", text: "text-blue-600", label: "접촉" },
    proposal: { bg: "bg-yellow-100", text: "text-yellow-600", label: "제안" },
    negotiation: { bg: "bg-purple-100", text: "text-purple-600", label: "협상" },
    won: { bg: "bg-green-100", text: "text-green-600", label: "수주" },
    lost: { bg: "bg-red-100", text: "text-red-600", label: "실패" },
  };
  const c = config[status] || config.lead;
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
};

// 정체 상태 뱃지
const StagnantBadge = () => (
  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600 flex items-center gap-1">
    <AlertCircle size={12} />
    정체
  </span>
);

// 우선순위 뱃지
const PriorityBadge = ({ priority }) => {
  const config = {
    high: { bg: "bg-red-50", text: "text-red-600", label: "높음" },
    medium: { bg: "bg-yellow-50", text: "text-yellow-600", label: "보통" },
    low: { bg: "bg-gray-50", text: "text-gray-600", label: "낮음" },
  };
  const c = config[priority] || config.medium;
  return (
    <span className={`px-2 py-0.5 rounded text-xs ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
};

export default function OpportunityList() {
  const navigate = useNavigate();
  const { filters, setFilter, toApiParams } = useUrlFilter();
  const { viewMode, toggleView, isMobile } = useResponsiveView();

  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(filters.search || "");

  // 데이터 로드
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = toApiParams();
      const res = await opportunityApi.getList(params);
      setOpportunities(res.data?.results ?? res.data ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [toApiParams]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 검색 처리 (디바운스)
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilter("search", searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, setFilter]);

  const statuses = [
    { value: "", label: "전체" },
    { value: "lead", label: "리드" },
    { value: "contact", label: "접촉" },
    { value: "proposal", label: "제안" },
    { value: "negotiation", label: "협상" },
    { value: "won", label: "수주" },
    { value: "lost", label: "실패" },
  ];

  // 카드 렌더러
  const renderCard = (opp) => (
    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium text-gray-900">{opp.title}</h3>
            {opp.is_stagnant && <StagnantBadge />}
          </div>
          <p className="text-sm text-gray-500">{opp.client_name}</p>
        </div>
        <StatusBadge status={opp.status} />
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-gray-500">예상금액</p>
          <p className="font-medium">{formatCurrency(opp.expected_amount)}</p>
        </div>
        <div>
          <p className="text-gray-500">확률</p>
          <p className="font-medium">{opp.probability}%</p>
        </div>
        <div>
          <p className="text-gray-500">담당자</p>
          <p className="font-medium">{opp.owner_name || "-"}</p>
        </div>
        <div>
          <p className="text-gray-500">마감예정</p>
          <p className="font-medium">
            {opp.expected_close_date
              ? new Date(opp.expected_close_date).toLocaleDateString("ko-KR")
              : "-"}
          </p>
        </div>
      </div>
      {opp.next_step && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-500">Next Step</p>
          <p className="text-sm text-gray-700 truncate">{opp.next_step}</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <TrendingUp size={24} />
          영업 기회
        </h1>
        <div className="flex items-center gap-2">
          {/* 뷰 전환 버튼 */}
          {!isMobile && (
            <button
              onClick={toggleView}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              title={viewMode === "table" ? "카드 뷰" : "테이블 뷰"}
            >
              {viewMode === "table" ? <LayoutGrid size={18} /> : <List size={18} />}
            </button>
          )}
          <button
            onClick={() => navigate("/sales/opportunities/new")}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">영업 기회 등록</span>
          </button>
        </div>
      </div>

      {/* 필터 탭 */}
      <div className="flex items-center gap-2 border-b border-gray-200 overflow-x-auto no-scrollbar">
        {statuses.map((s) => (
          <button
            key={s.value}
            onClick={() => setFilter("status", s.value)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
              (filters.status || "") === s.value
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {s.label}
          </button>
        ))}
        {/* 정체 필터 */}
        <button
          onClick={() => setFilter("stagnant", filters.stagnant === "true" ? "" : "true")}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap flex items-center gap-1 ${
            filters.stagnant === "true"
              ? "border-red-600 text-red-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <AlertCircle size={14} />
          정체
        </button>
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
              placeholder="건명, 거래처 검색..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        {/* 데이터 표시 */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
          </div>
        ) : opportunities.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            영업 기회가 없습니다.
          </div>
        ) : viewMode === "table" && !isMobile ? (
          /* 테이블 뷰 */
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">건명</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">거래처</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">상태</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">예상금액</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">확률</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">담당자</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">마감예정</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {opportunities.map((opp) => (
                  <tr
                    key={opp.id}
                    onClick={() => navigate(`/sales/opportunities/${opp.id}`)}
                    className="hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{opp.title}</span>
                        {opp.is_stagnant && <StagnantBadge />}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{opp.client_name}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={opp.status} />
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatCurrency(opp.expected_amount)}
                    </td>
                    <td className="px-4 py-3 text-center">{opp.probability}%</td>
                    <td className="px-4 py-3 text-gray-600">{opp.owner_name}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {opp.expected_close_date
                        ? new Date(opp.expected_close_date).toLocaleDateString("ko-KR")
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* 카드 뷰 */
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {opportunities.map((opp) => (
              <div
                key={opp.id}
                onClick={() => navigate(`/sales/opportunities/${opp.id}`)}
                className="cursor-pointer"
              >
                {renderCard(opp)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
