// src/pages/sales/OpportunityList.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../../api/axios";
import { Plus, Search, TrendingUp, Filter } from "lucide-react";

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

export default function OpportunityList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const statusFilter = searchParams.get("status") || "";

  // 데이터 로드
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      let url = "operation/opportunities/";
      const params = new URLSearchParams();
      if (statusFilter) params.append("status", statusFilter);
      if (searchQuery) params.append("search", searchQuery);
      if (params.toString()) url += `?${params.toString()}`;

      const res = await api.get(url);
      setOpportunities(res.data?.results ?? res.data ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const statuses = [
    { value: "", label: "전체" },
    { value: "lead", label: "리드" },
    { value: "contact", label: "접촉" },
    { value: "proposal", label: "제안" },
    { value: "negotiation", label: "협상" },
    { value: "won", label: "수주" },
    { value: "lost", label: "실패" },
  ];

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <TrendingUp size={24} />
          영업 기회
        </h1>
        <button
          onClick={() => navigate("/sales/opportunities/new")}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={18} />
          영업 기회 등록
        </button>
      </div>

      {/* 필터 탭 */}
      <div className="flex items-center gap-2 border-b border-gray-200">
        {statuses.map((s) => (
          <button
            key={s.value}
            onClick={() => setSearchParams(s.value ? { status: s.value } : {})}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              statusFilter === s.value
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {s.label}
          </button>
        ))}
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

        {/* 테이블 */}
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
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent mx-auto"></div>
                  </td>
                </tr>
              ) : opportunities.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-500">
                    영업 기회가 없습니다.
                  </td>
                </tr>
              ) : (
                opportunities.map((opp) => (
                  <tr
                    key={opp.id}
                    onClick={() => navigate(`/sales/opportunities/${opp.id}`)}
                    className="hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">{opp.title}</td>
                    <td className="px-4 py-3 text-gray-600">{opp.client_name}</td>
                    <td className="px-4 py-3"><StatusBadge status={opp.status} /></td>
                    <td className="px-4 py-3 text-right font-medium">{formatCurrency(opp.expected_amount)}</td>
                    <td className="px-4 py-3 text-center">{opp.probability}%</td>
                    <td className="px-4 py-3 text-gray-600">{opp.owner_name}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {opp.expected_close_date ? new Date(opp.expected_close_date).toLocaleDateString('ko-KR') : "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
