// src/pages/operation/QuoteList.jsx
/**
 * 견적서 목록
 */
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FiPlus, FiFileText, FiSearch, FiSend } from "react-icons/fi";
import { QuoteService } from "../../api/operation";

function QuoteList() {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const fetchQuotes = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;

      const data = await QuoteService.getQuotes(params);
      let results = data.results || data;

      // 클라이언트 사이드 검색
      if (searchQuery) {
        results = results.filter(
          (q) =>
            q.quote_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
            q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            q.company_name?.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      setQuotes(results);
    } catch (error) {
      console.error("Error fetching quotes:", error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    fetchQuotes();
  }, [fetchQuotes]);

  const handleSend = async (e, quoteId) => {
    e.stopPropagation();
    if (!window.confirm("견적서를 발송하시겠습니까?")) return;

    try {
      await QuoteService.sendQuote(quoteId);
      fetchQuotes();
    } catch (error) {
      console.error("Error sending quote:", error);
    }
  };

  const formatAmount = (amount) => {
    if (!amount) return "-";
    return new Intl.NumberFormat("ko-KR").format(amount) + "원";
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("ko-KR");
  };

  const statusLabels = {
    draft: { label: "작성중", color: "bg-gray-100 text-gray-700" },
    sent: { label: "발송됨", color: "bg-blue-100 text-blue-700" },
    accepted: { label: "수락", color: "bg-green-100 text-green-700" },
    rejected: { label: "거절", color: "bg-red-100 text-red-700" },
    expired: { label: "만료", color: "bg-orange-100 text-orange-700" },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FiFileText className="w-6 h-6 text-blue-600" />
          <h1 className="text-title">견적서</h1>
        </div>
        <button
          onClick={() => navigate("/operation/sales/quotes/new")}
          className="btn-create flex items-center gap-2"
        >
          <FiPlus className="w-4 h-4" />
          견적서 작성
        </button>
      </div>

      {/* Filters */}
      <div className="page-box">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="견적번호, 제목, 고객사..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-search"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-base w-32"
          >
            <option value="">전체 상태</option>
            <option value="draft">작성중</option>
            <option value="sent">발송됨</option>
            <option value="accepted">수락</option>
            <option value="rejected">거절</option>
            <option value="expired">만료</option>
          </select>
        </div>
      </div>

      {/* List */}
      <div className="page-box overflow-x-auto">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
          </div>
        ) : quotes.length === 0 ? (
          <div className="text-center py-12">
            <FiFileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">등록된 견적서가 없습니다.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="doc-thead">
              <tr>
                <th className="doc-th text-left">견적번호</th>
                <th className="doc-th text-left">제목</th>
                <th className="doc-th text-left">고객사</th>
                <th className="doc-th text-left">영업기회</th>
                <th className="doc-th text-right">총액</th>
                <th className="doc-th text-center">상태</th>
                <th className="doc-th text-center">작성일</th>
                <th className="doc-th-end text-center">액션</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((quote) => (
                <tr
                  key={quote.id}
                  onClick={() =>
                    navigate(`/operation/sales/quotes/${quote.id}`)
                  }
                  className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-3 py-3 text-sm font-mono">
                    {quote.quote_number}
                  </td>
                  <td className="px-3 py-3 text-sm">{quote.title}</td>
                  <td className="px-3 py-3 text-sm">
                    {quote.company_name || "-"}
                  </td>
                  <td className="px-3 py-3 text-sm">
                    {quote.lead_title || "-"}
                  </td>
                  <td className="px-3 py-3 text-sm text-right font-medium">
                    {formatAmount(quote.total_amount)}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        statusLabels[quote.status]?.color
                      }`}
                    >
                      {statusLabels[quote.status]?.label}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-sm text-center">
                    {formatDate(quote.created_at)}
                  </td>
                  <td className="px-3 py-3 text-center">
                    {quote.status === "draft" && (
                      <button
                        onClick={(e) => handleSend(e, quote.id)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                        title="발송"
                      >
                        <FiSend className="w-4 h-4" />
                      </button>
                    )}
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

export default QuoteList;
