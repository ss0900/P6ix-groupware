// src/pages/operation/TenderList.jsx
/**
 * 입찰 목록
 */
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FiClipboard, FiPlus, FiSearch } from "react-icons/fi";
import { TenderService } from "../../api/operation";
import BoardTable from "../../components/common/board/BoardTable";
import BoardToolbar from "../../components/common/board/BoardToolbar";
import BoardPagination from "../../components/common/board/BoardPagination";
import SearchFilterBar from "../../components/common/board/SearchFilterBar";

function TenderList() {
  const navigate = useNavigate();
  const [tenders, setTenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  const fetchTenders = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, page_size: pageSize };
      if (statusFilter) params.status = statusFilter;
      if (searchQuery) params.search = searchQuery;
      const data = await TenderService.getTenders(params);
      const results = data.results || data;
      setTenders(results);
      setTotal(data.count ?? results.length);
    } catch (error) {
      console.error("Error fetching tenders:", error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery, page, pageSize]);

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

  const columns = [
    {
      key: "title",
      header: "입찰명",
      align: "left",
      render: (tender) => (
        <div className="font-medium text-gray-900">{tender.title}</div>
      ),
    },
    {
      key: "lead_title",
      header: "연관 리드",
      align: "left",
      render: (tender) => tender.lead_title || "-",
    },
    {
      key: "status",
      header: "상태",
      align: "center",
      render: (tender) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            statusLabels[tender.status]?.color || "bg-gray-100 text-gray-700"
          }`}
        >
          {statusLabels[tender.status]?.label || tender.status}
        </span>
      ),
    },
    {
      key: "deadline",
      header: "마감일",
      align: "center",
      render: (tender) => formatDateTime(tender.deadline),
    },
    {
      key: "bond_amount",
      header: "보증금",
      align: "right",
      render: (tender) => formatAmount(tender.bond_amount),
    },
    {
      key: "created_at",
      header: "등록일",
      align: "center",
      render: (tender) => formatDateTime(tender.created_at),
    },
  ];

  return (
    <div className="space-y-6">
      <BoardToolbar
        title="입찰"
        actions={
          <button
            onClick={() => navigate("/operation/sales/tenders/new")}
            className="btn-create flex items-center gap-2"
          >
            <FiPlus className="w-4 h-4" />
            입찰 등록
          </button>
        }
      />

      <SearchFilterBar
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
        }}
        actions={
          <button onClick={fetchTenders} className="btn-search">
            검색
          </button>
        }
      >
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
      </SearchFilterBar>

      <BoardTable
        columns={columns}
        rows={tenders}
        loading={loading}
        onRowClick={(row) => navigate(`/operation/sales/tenders/${row.id}`)}
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

export default TenderList;
