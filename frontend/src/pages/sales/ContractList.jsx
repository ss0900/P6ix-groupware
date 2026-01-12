// src/pages/sales/ContractList.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../../api/axios";
import { Plus, Receipt } from "lucide-react";

// 숫자 포맷
const formatCurrency = (value) => {
  if (!value) return "₩0";
  return `₩${Number(value).toLocaleString()}`;
};

// 상태 뱃지
const StatusBadge = ({ status }) => {
  const config = {
    draft: { bg: "bg-gray-100", text: "text-gray-600", label: "작성중" },
    pending: { bg: "bg-yellow-100", text: "text-yellow-600", label: "검토중" },
    active: { bg: "bg-green-100", text: "text-green-600", label: "진행중" },
    completed: { bg: "bg-blue-100", text: "text-blue-600", label: "완료" },
    terminated: { bg: "bg-red-100", text: "text-red-600", label: "해지" },
  };
  const c = config[status] || config.draft;
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
};

export default function ContractList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);

  const statusFilter = searchParams.get("status") || "";

  // 데이터 로드
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      let url = "operation/contracts/";
      if (statusFilter) url += `?status=${statusFilter}`;
      const res = await api.get(url);
      setContracts(res.data?.results ?? res.data ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const statuses = [
    { value: "", label: "전체" },
    { value: "draft", label: "작성중" },
    { value: "pending", label: "검토중" },
    { value: "active", label: "진행중" },
    { value: "completed", label: "완료" },
    { value: "terminated", label: "해지" },
  ];

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Receipt size={24} />
          계약 관리
        </h1>
        <button
          onClick={() => navigate("/sales/contracts/new")}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={18} />
          계약 등록
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
        {/* 테이블 */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">계약번호</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">제목</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">거래처</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">상태</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">계약금액</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">계약기간</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent mx-auto"></div>
                  </td>
                </tr>
              ) : contracts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-500">
                    계약이 없습니다.
                  </td>
                </tr>
              ) : (
                contracts.map((con) => (
                  <tr
                    key={con.id}
                    onClick={() => navigate(`/sales/contracts/${con.id}`)}
                    className="hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-4 py-3 text-blue-600 font-medium">{con.contract_number}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{con.title}</td>
                    <td className="px-4 py-3 text-gray-600">{con.client_name}</td>
                    <td className="px-4 py-3"><StatusBadge status={con.status} /></td>
                    <td className="px-4 py-3 text-right font-medium">{formatCurrency(con.amount)}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {con.start_date && con.end_date ? (
                        `${new Date(con.start_date).toLocaleDateString('ko-KR')} ~ ${new Date(con.end_date).toLocaleDateString('ko-KR')}`
                      ) : "-"}
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
