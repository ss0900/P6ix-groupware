// src/pages/operation/LeadList.jsx
/**
 * 영업기회 리스트 페이지
 */
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FiPlus, FiSearch, FiFilter, FiAlertCircle } from "react-icons/fi";
import { SalesService } from "../../api/operation";

function LeadList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pipelines, setPipelines] = useState([]);
  const [stages, setStages] = useState([]);

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

      const response = await SalesService.getLeads(params);
      setLeads(response.results || response);
    } catch (error) {
      console.error("Error fetching leads:", error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

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

    // URL 파라미터 업데이트
    const params = new URLSearchParams();
    Object.entries(newFilters).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
    setSearchParams(params);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchLeads();
  };

  const formatAmount = (amount) => {
    if (!amount) return "-";
    return new Intl.NumberFormat("ko-KR").format(amount) + "원";
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("ko-KR");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-title">영업기회</h1>
        <button
          onClick={() => navigate("/operation/sales/leads/new")}
          className="btn-create flex items-center gap-2"
        >
          <FiPlus className="w-4 h-4" />새 영업기회
        </button>
      </div>

      {/* Filters */}
      <div className="page-box">
        <form
          onSubmit={handleSearch}
          className="flex flex-wrap gap-4 items-end"
        >
          {/* 검색어 */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              검색
            </label>
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="제목, 고객사, 담당자..."
                value={filters.q}
                onChange={(e) => handleFilterChange("q", e.target.value)}
                className="input-search"
              />
            </div>
          </div>

          {/* 파이프라인 */}
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

          {/* 단계 */}
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

          {/* 상태 */}
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

          {/* 유입 경로 */}
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

          {/* 예상 마감일 범위 */}
          <div className="w-40">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              마감일 시작
            </label>
            <input
              type="date"
              value={filters.close_date_from}
              onChange={(e) =>
                handleFilterChange("close_date_from", e.target.value)
              }
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
              onChange={(e) =>
                handleFilterChange("close_date_to", e.target.value)
              }
              className="input-base text-sm"
            />
          </div>

          {/* 예상 금액 범위 */}
          <div className="flex items-end gap-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                금액 최소
              </label>
              <input
                type="number"
                value={filters.amount_min}
                onChange={(e) =>
                  handleFilterChange("amount_min", e.target.value)
                }
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
                onChange={(e) =>
                  handleFilterChange("amount_max", e.target.value)
                }
                className="input-base text-sm w-32"
                placeholder="0"
              />
            </div>
          </div>

          {/* 지연만 보기 */}
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

          <button type="submit" className="btn-search flex items-center gap-2">
            <FiFilter className="w-4 h-4" />
            검색
          </button>
        </form>
      </div>

      {/* Table */}
      <div className="page-box overflow-x-auto">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
          </div>
        ) : leads.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            등록된 영업기회가 없습니다.
          </div>
        ) : (
          <table className="w-full">
            <thead className="doc-thead">
              <tr>
                <th className="doc-th text-left">단계</th>
                <th className="doc-th text-left">고객사</th>
                <th className="doc-th text-left">제목</th>
                <th className="doc-th text-right">예상금액</th>
                <th className="doc-th text-center">담당자</th>
                <th className="doc-th text-center">다음 액션일</th>
                <th className="doc-th text-center">최근활동일</th>
                <th className="doc-th-end text-center">상태</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr
                  key={lead.id}
                  onClick={() => navigate(`/operation/sales/leads/${lead.id}`)}
                  className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-3 py-3">
                    <span
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: lead.stage_color + "20",
                        color: lead.stage_color,
                      }}
                    >
                      {lead.stage_name}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-sm">
                    {lead.company_name || "-"}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">
                        {lead.title}
                      </span>
                      {lead.is_stalled && (
                        <span className="flex items-center gap-1 text-xs text-orange-600">
                          <FiAlertCircle className="w-3 h-3" />
                          {lead.stalled_days}일
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-sm text-right">
                    {formatAmount(lead.expected_amount)}
                  </td>
                  <td className="px-3 py-3 text-sm text-center">
                    {lead.owner_name || "-"}
                  </td>
                  <td className="px-3 py-3 text-sm text-center">
                    {formatDate(lead.next_action_due_at)}
                  </td>
                  <td className="px-3 py-3 text-sm text-center">
                    {formatDate(lead.last_contacted_at)}
                  </td>
                  <td className="px-3 py-3 text-center">
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

export default LeadList;
