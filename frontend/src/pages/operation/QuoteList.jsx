// src/pages/operation/QuoteList.jsx
/**
 * 견적서 목록
 */
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FiPlus, FiFileText, FiSearch, FiSend } from "react-icons/fi";
import { QuoteService } from "../../api/operation";
import BoardTable from "../../components/common/board/BoardTable";
import BoardToolbar from "../../components/common/board/BoardToolbar";
import BoardPagination from "../../components/common/board/BoardPagination";
import SearchFilterBar from "../../components/common/board/SearchFilterBar";

function QuoteList() {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  const fetchQuotes = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, page_size: pageSize };
      if (statusFilter) params.status = statusFilter;
      if (searchQuery) params.search = searchQuery;

      const data = await QuoteService.getQuotes(params);
      const results = data.results || data;
      setQuotes(results);
      setTotal(data.count ?? results.length);
    } catch (error) {
      console.error("Error fetching quotes:", error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery, page, pageSize]);

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

  const columns = [
    {
      key: "quote_number",
      header: "견적번호",
      align: "left",
      render: (quote) => (
        <span className="text-sm font-mono">{quote.quote_number}</span>
      ),
    },
    {
      key: "title",
      header: "제목",
      align: "left",
      render: (quote) => quote.title,
    },
    {
      key: "company_name",
      header: "고객사",
      align: "left",
      render: (quote) => quote.company_name || "-",
    },
    {
      key: "lead_title",
      header: "영업기회",
      align: "left",
      render: (quote) => quote.lead_title || "-",
    },
    {
      key: "total_amount",
      header: "총액",
      align: "right",
      render: (quote) => formatAmount(quote.total_amount),
    },
    {
      key: "status",
      header: "상태",
      align: "center",
      render: (quote) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            statusLabels[quote.status]?.color || "bg-gray-100 text-gray-700"
          }`}
        >
          {statusLabels[quote.status]?.label || quote.status}
        </span>
      ),
    },
    {
      key: "created_at",
      header: "작성일",
      align: "center",
      render: (quote) => formatDate(quote.created_at),
    },
    {
      key: "actions",
      header: "액션",
      align: "center",
      render: (quote) =>
        quote.status === "draft" ? (
          <button
            onClick={(e) => handleSend(e, quote.id)}
            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
            title="발송"
          >
            <FiSend className="w-4 h-4" />
          </button>
        ) : (
          "-"
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <BoardToolbar
        title="견적서"
        actions={
          <button
            onClick={() => navigate("/operation/sales/quotes/new")}
            className="btn-create flex items-center gap-2"
          >
            <FiPlus className="w-4 h-4" />
            견적서 작성
          </button>
        }
      />

      <SearchFilterBar
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
        }}
        actions={
          <button type="submit" className="btn-search">
            검색
          </button>
        }
      >
        <div className="flex-1 relative min-w-[240px]">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="견적번호, 제목, 고객사.."
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
      </SearchFilterBar>

      <BoardTable
        columns={columns}
        rows={quotes}
        loading={loading}
        onRowClick={(row) => navigate(`/operation/sales/quotes/${row.id}`)}
      />

      <BoardPagination
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
        className="page-box"
      />
    </div>
  );
}

export default QuoteList;
