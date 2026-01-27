// src/pages/operation/LeadList.jsx
/**
 * 영업기회 리스트 페이지
 */
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FiPlus, FiSearch, FiFilter, FiAlertCircle } from "react-icons/fi";
import { SalesService } from "../../api/operation";
import BoardTable from "../../components/common/board/BoardTable";
import BoardToolbar from "../../components/common/board/BoardToolbar";
import BoardPagination from "../../components/common/board/BoardPagination";
import SearchFilterBar from "../../components/common/board/SearchFilterBar";

function LeadList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pipelines, setPipelines] = useState([]);
  const [stages, setStages] = useState([]);
  const [page, setPage] = useState(Number(searchParams.get("page") || 1));
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  // 필터 상태
  const [filters, setFilters] = useState({
    q: searchParams.get("q") || "",
    pipeline: searchParams.get("pipeline") || "",
    stage: searchParams.get("stage") || "",
    status: searchParams.get("status") || "active",
    stalled: searchParams.get("stalled") === "true",
    amount_min: searchParams.get("amount_min") || "",
    amount_max: searchParams.get("amount_max") || "",
    close_date_from: searchParams.get("close_date_from") || "",
    close_date_to: searchParams.get("close_date_to") || "",
    source: searchParams.get("source") || "",
  });

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.q) params.q = filters.q;
      if (filters.pipeline) params.pipeline = filters.pipeline;
      if (filters.stage) params.stage = filters.stage;
      if (filters.status) params.status = filters.status;
      if (filters.stalled) params.stalled = true;
      if (filters.amount_min) params.amount_min = filters.amount_min;
      if (filters.amount_max) params.amount_max = filters.amount_max;
      if (filters.close_date_from) params.close_date_from = filters.close_date_from;
      if (filters.close_date_to) params.close_date_to = filters.close_date_to;
      if (filters.source) params.source = filters.source;

      params.page = page;
      params.page_size = pageSize;
      const response = await SalesService.getLeads(params);
      const results = response.results || response;
      setLeads(results);
      setTotal(response.count ?? results.length);
    } catch (error) {
      console.error("Error fetching leads:", error);
    } finally {
      setLoading(false);
    }
  }, [filters, page, pageSize]);

  const fetchPipelines = useCallback(async () => {
    try {
      const data = await SalesService.getPipelines();
      setPipelines(data);

      // 선택된 파이프라인의 단계 로드
      if (filters.pipeline) {
        const stagesData = await SalesService.getStages(filters.pipeline);
        setStages(stagesData);
      }
    } catch (error) {
      console.error("Error fetching pipelines:", error);
    }
  }, [filters.pipeline]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  useEffect(() => {
    fetchPipelines();
  }, [fetchPipelines]);

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    setPage(1);

    const params = new URLSearchParams();
    Object.entries(newFilters).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
    setSearchParams(params);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
  };

  const formatAmount = (amount) => {
    if (!amount) return "-";
    return new Intl.NumberFormat("ko-KR").format(amount) + "원";
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("ko-KR");
  };

  const columns = [
    {
      key: "stage_name",
      header: "단계",
      align: "left",
      render: (lead) => (
        <span
          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
          style={{
            backgroundColor: lead.stage_color + "20",
            color: lead.stage_color,
          }}
        >
          {lead.stage_name}
        </span>
      ),
    },
    {
      key: "company_name",
      header: "고객사",
      align: "left",
      render: (lead) => lead.company_name || "-",
    },
    {
      key: "title",
      header: "제목",
      align: "left",
      render: (lead) => (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900">{lead.title}</span>
          {lead.is_stalled && (
            <span className="flex items-center gap-1 text-xs text-orange-600">
              <FiAlertCircle className="w-3 h-3" />
              {lead.stalled_days}d
            </span>
          )}
        </div>
      ),
    },
    {
      key: "expected_amount",
      header: "예상금액",
      align: "right",
      render: (lead) => formatAmount(lead.expected_amount),
    },
    {
      key: "owner_name",
      header: "담당자",
      align: "center",
      render: (lead) => lead.owner_name || "-",
    },
    {
      key: "next_action_due_at",
      header: "다음 액션일",
      align: "center",
      render: (lead) => formatDate(lead.next_action_due_at),
    },
    {
      key: "last_contacted_at",
      header: "최근 접촉",
      align: "center",
      render: (lead) => formatDate(lead.last_contacted_at),
    },
    {
      key: "status",
      header: "상태",
      align: "center",
      render: (lead) => (
        <span
          className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
            lead.status === "won"
              ? "bg-green-100 text-green-700"
              : lead.status === "lost"
              ? "bg-red-100 text-red-700"
              : "bg-blue-100 text-blue-700"
          }`}
        >
          {lead.status === "won"
            ? "수주"
            : lead.status === "lost"
            ? "실주"
            : "진행"}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <BoardToolbar
        title="영업기회"
        actions={
          <button
            onClick={() => navigate("/operation/sales/leads/new")}
            className="btn-create flex items-center gap-2"
          >
            <FiPlus className="w-4 h-4" />
            새 영업기회
          </button>
        }
      />

      <SearchFilterBar
        onSubmit={handleSearch}
        actions={
          <button type="submit" className="btn-search flex items-center gap-2">
            <FiFilter className="w-4 h-4" />
            검색
          </button>
        }
      >
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            검색
          </label>
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="제목, 고객사, 담당자.."
              value={filters.q}
              onChange={(e) => handleFilterChange("q", e.target.value)}
              className="input-search"
            />
          </div>
        </div>

        <div className="w-40">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            파이프라인
          </label>
          <select
            value={filters.pipeline}
            onChange={(e) => handleFilterChange("pipeline", e.target.value)}
            className="input-base text-sm"
          >
            <option value="">전체</option>
            {pipelines.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="w-40">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            단계
          </label>
          <select
            value={filters.stage}
            onChange={(e) => handleFilterChange("stage", e.target.value)}
            className="input-base text-sm"
            disabled={!filters.pipeline}
          >
            <option value="">전체</option>
            {stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="w-32">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            상태
          </label>
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange("status", e.target.value)}
            className="input-base text-sm"
          >
            <option value="">전체</option>
            <option value="active">진행중</option>
            <option value="won">수주</option>
            <option value="lost">실주</option>
          </select>
        </div>

        <div className="w-40">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            유입 경로
          </label>
          <input
            type="text"
            value={filters.source}
            onChange={(e) => handleFilterChange("source", e.target.value)}
            className="input-base text-sm"
            placeholder="전화/소개/입찰 등"
          />
        </div>

        <div className="w-40">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            마감일 시작
          </label>
          <input
            type="date"
            value={filters.close_date_from}
            onChange={(e) => handleFilterChange("close_date_from", e.target.value)}
            className="input-base text-sm"
          />
        </div>
        <div className="w-40">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            마감일 종료
          </label>
          <input
            type="date"
            value={filters.close_date_to}
            onChange={(e) => handleFilterChange("close_date_to", e.target.value)}
            className="input-base text-sm"
          />
        </div>

        <div className="flex items-end gap-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              금액 최소
            </label>
            <input
              type="number"
              value={filters.amount_min}
              onChange={(e) => handleFilterChange("amount_min", e.target.value)}
              className="input-base text-sm w-32"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              금액 최대
            </label>
            <input
              type="number"
              value={filters.amount_max}
              onChange={(e) => handleFilterChange("amount_max", e.target.value)}
              className="input-base text-sm w-32"
              placeholder="0"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="stalled"
            checked={filters.stalled}
            onChange={(e) => handleFilterChange("stalled", e.target.checked)}
            className="w-4 h-4 rounded border-gray-300"
          />
          <label htmlFor="stalled" className="text-sm text-gray-700">
            지연만 보기
          </label>
        </div>
      </SearchFilterBar>

      <BoardTable
        columns={columns}
        rows={leads}
        loading={loading}
        onRowClick={(row) => navigate(`/operation/sales/leads/${row.id}`)}
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

export default LeadList;
