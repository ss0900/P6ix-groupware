// src/pages/operation/TenderList.jsx
/**
 * 입찰 목록
 */
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FiClipboard, FiPlus, FiSearch } from "react-icons/fi";
import { TenderService } from "../../api/operation";

function TenderList() {
  const navigate = useNavigate();
  const [tenders, setTenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchTenders = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (searchQuery) params.search = searchQuery;
      const data = await TenderService.getTenders(params);
      setTenders(data.results || data);
    } catch (error) {
      console.error("Error fetching tenders:", error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    fetchTenders();
  }, [fetchTenders]);

  const formatDateTime = (value) => {
    if (!value) return "-";
    return new Date(value).toLocaleString("ko-KR");
  };

  const formatAmount = (amount) => {
    if (!amount) return "-";
    return new Intl.NumberFormat("ko-KR").format(amount) + "원";
  };

  const statusLabels = {
    open: { label: "진행중", color: "bg-blue-100 text-blue-700" },
    submitted: { label: "제출완료", color: "bg-amber-100 text-amber-700" },
    won: { label: "낙찰", color: "bg-green-100 text-green-700" },
    lost: { label: "탈락", color: "bg-red-100 text-red-700" },
    closed: { label: "마감", color: "bg-gray-100 text-gray-700" },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FiClipboard className="w-6 h-6 text-blue-600" />
          <h1 className="text-title">입찰</h1>
        </div>
        <button
          onClick={() => navigate("/operation/sales/tenders/new")}
          className="btn-create flex items-center gap-2"
        >
          <FiPlus className="w-4 h-4" />
          입찰 등록
        </button>
      </div>

      <div className="page-box">
        <div className="flex gap-4 flex-wrap items-center">
          <div className="flex-1 min-w-[240px] relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="입찰명 검색"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-search"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-base w-36"
          >
            <option value="">전체 상태</option>
            <option value="open">진행중</option>
            <option value="submitted">제출완료</option>
            <option value="won">낙찰</option>
            <option value="lost">탈락</option>
            <option value="closed">마감</option>
          </select>
          <button onClick={fetchTenders} className="btn-search">
            검색
          </button>
        </div>
      </div>

      <div className="page-box overflow-x-auto">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
          </div>
        ) : tenders.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            등록된 입찰이 없습니다.
          </div>
        ) : (
          <table className="w-full">
            <thead className="doc-thead">
              <tr>
                <th className="doc-th text-left">입찰명</th>
                <th className="doc-th text-left">연관 리드</th>
                <th className="doc-th text-center">상태</th>
                <th className="doc-th text-center">마감일</th>
                <th className="doc-th text-right">보증금</th>
                <th className="doc-th-end text-center">등록일</th>
              </tr>
            </thead>
            <tbody>
              {tenders.map((tender) => (
                <tr
                  key={tender.id}
                  onClick={() =>
                    navigate(`/operation/sales/tenders/${tender.id}`)
                  }
                  className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-3 py-3 text-sm font-medium text-gray-900">
                    {tender.title}
                  </td>
                  <td className="px-3 py-3 text-sm text-gray-600">
                    {tender.lead_title || "-"}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        statusLabels[tender.status]?.color ||
                        "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {statusLabels[tender.status]?.label || tender.status}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-sm text-center">
                    {formatDateTime(tender.deadline)}
                  </td>
                  <td className="px-3 py-3 text-sm text-right">
                    {formatAmount(tender.bond_amount)}
                  </td>
                  <td className="px-3 py-3 text-sm text-center">
                    {formatDateTime(tender.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default TenderList;
