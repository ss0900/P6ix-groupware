// src/pages/sales/SalesDashboard.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { opportunityApi, clientApi, dashboardApi, invoiceApi } from "../../api/salesApi";
import { useUrlFilter } from "../../hooks/useUrlFilter";
import {
  TrendingUp,
  Building2,
  FileText,
  Plus,
  Target,
  ChevronRight,
  BarChart3,
  AlertCircle,
  DollarSign,
  Calendar,
  Filter,
  RefreshCw,
} from "lucide-react";

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

export default function SalesDashboard() {
  const navigate = useNavigate();
  const { filters, setFilter, drillDown, toApiParams } = useUrlFilter();

  const [stats, setStats] = useState(null);
  const [trend, setTrend] = useState(null);
  const [opportunities, setOpportunities] = useState([]);
  const [clients, setClients] = useState([]);
  const [receivable, setReceivable] = useState(null);
  const [loading, setLoading] = useState(true);

  // 데이터 로드
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = toApiParams();
      const [statsRes, trendRes, oppsRes, clientsRes, receivableRes] = await Promise.all([
        opportunityApi.getStats(params),
        opportunityApi.getTrend(params),
        opportunityApi.getList({ ...params, limit: 5 }),
        clientApi.getList({ limit: 5 }),
        invoiceApi.getReceivableSummary(),
      ]);

      setStats(statsRes.data);
      setTrend(trendRes.data);
      setOpportunities(oppsRes.data?.results ?? oppsRes.data ?? []);
      setClients(clientsRes.data?.results ?? clientsRes.data ?? []);
      setReceivable(receivableRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [toApiParams]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 파이프라인 계산
  const pipelineByStatus = stats?.by_status?.reduce((acc, item) => {
    acc[item.status] = item;
    return acc;
  }, {}) || {};

  const statusLabels = {
    lead: "리드",
    contact: "접촉",
    proposal: "제안",
    negotiation: "협상",
    won: "수주",
  };

  const statusColors = {
    lead: "bg-gray-400",
    contact: "bg-blue-500",
    proposal: "bg-yellow-500",
    negotiation: "bg-purple-500",
    won: "bg-green-500",
  };

  // 파이프라인 전체 금액
  const totalPipelineAmount = stats?.by_status?.reduce(
    (sum, item) => sum + (item.total_amount || 0),
    0
  ) || 1;

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-gray-900">영업관리</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            title="새로고침"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={() => navigate("/sales/clients/new")}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Building2 size={18} />
            <span className="hidden sm:inline">거래처 등록</span>
          </button>
          <button
            onClick={() => navigate("/sales/opportunities/new")}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">영업 기회 등록</span>
          </button>
        </div>
      </div>

      {/* 필터 바 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Filter size={16} />
            <span>필터:</span>
          </div>
          <select
            value={filters.owner || ""}
            onChange={(e) => setFilter("owner", e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">전체 담당자</option>
            <option value="me">내 담당</option>
          </select>
          <input
            type="date"
            value={filters.start_date || ""}
            onChange={(e) => setFilter("start_date", e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
            placeholder="시작일"
          />
          <input
            type="date"
            value={filters.end_date || ""}
            onChange={(e) => setFilter("end_date", e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
            placeholder="종료일"
          />
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          className="bg-white rounded-xl border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => drillDown("/sales/opportunities", { status: "" })}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">진행중 파이프라인</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(stats?.pipeline?.total)}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {stats?.pipeline?.count || 0}건
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <TrendingUp size={24} className="text-blue-600" />
            </div>
          </div>
        </div>

        <div
          className="bg-white rounded-xl border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => drillDown("/sales/opportunities", { status: "won" })}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">이번 달 수주</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(stats?.won_this_month?.amount)}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {stats?.won_this_month?.count || 0}건
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <Target size={24} className="text-green-600" />
            </div>
          </div>
        </div>

        <div
          className="bg-white rounded-xl border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => drillDown("/sales/opportunities", { stagnant: "true" })}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">정체 기회</p>
              <p className="text-2xl font-bold text-red-600">
                {stats?.stagnant_count || 0}건
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Next Step 미설정
              </p>
            </div>
            <div className="p-3 bg-red-100 rounded-lg">
              <AlertCircle size={24} className="text-red-600" />
            </div>
          </div>
        </div>

        <div
          className="bg-white rounded-xl border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => drillDown("/sales/invoices", { overdue: "true" })}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">미수금</p>
              <p className="text-2xl font-bold text-orange-600">
                {formatCurrency(receivable?.summary?.total_balance)}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                연체 {receivable?.summary?.total_overdue_count || 0}건
              </p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <DollarSign size={24} className="text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* 파이프라인 차트 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <BarChart3 size={18} />
          영업 파이프라인
        </h2>
        
        {/* 퍼널 차트 스타일 */}
        <div className="space-y-3">
          {["lead", "contact", "proposal", "negotiation", "won"].map((status) => {
            const data = pipelineByStatus[status] || { count: 0, total_amount: 0 };
            const percentage = totalPipelineAmount > 0
              ? ((data.total_amount || 0) / totalPipelineAmount) * 100
              : 0;

            return (
              <div
                key={status}
                className="cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
                onClick={() => drillDown("/sales/opportunities", { status })}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">
                    {statusLabels[status]}
                  </span>
                  <div className="text-right">
                    <span className="text-sm font-semibold">{data.count || 0}건</span>
                    <span className="text-xs text-gray-400 ml-2">
                      {formatCurrency(data.total_amount)}
                    </span>
                  </div>
                </div>
                <div className="h-6 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${statusColors[status]} rounded-full transition-all duration-500`}
                    style={{ width: `${Math.max(percentage, 2)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* YoY 트렌드 */}
      {trend?.yoy && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Calendar size={18} />
            연간 실적 비교
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">전년도 ({trend.yoy.current_year - 1})</p>
              <p className="text-xl font-bold text-gray-700">
                {formatCurrency(trend.yoy.last_year_amount)}
              </p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-500">올해 ({trend.yoy.current_year})</p>
              <p className="text-xl font-bold text-blue-600">
                {formatCurrency(trend.yoy.current_amount)}
              </p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-gray-500">YoY 증감률</p>
              <p className={`text-xl font-bold ${
                trend.yoy.change_percent >= 0 ? "text-green-600" : "text-red-600"
              }`}>
                {trend.yoy.change_percent >= 0 ? "+" : ""}
                {trend.yoy.change_percent}%
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 최근 영업 기회 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <TrendingUp size={18} />
              최근 영업 기회
            </h2>
            <button
              onClick={() => navigate("/sales/opportunities")}
              className="text-sm text-blue-600 hover:underline flex items-center gap-1"
            >
              전체 보기 <ChevronRight size={14} />
            </button>
          </div>
          <div className="space-y-3">
            {loading ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent" />
              </div>
            ) : opportunities.length === 0 ? (
              <p className="text-center py-4 text-gray-400">등록된 영업 기회가 없습니다.</p>
            ) : (
              opportunities.slice(0, 5).map((opp) => (
                <div
                  key={opp.id}
                  onClick={() => navigate(`/sales/opportunities/${opp.id}`)}
                  className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">{opp.title}</p>
                      {opp.is_stagnant && <StagnantBadge />}
                    </div>
                    <p className="text-sm text-gray-500">{opp.client_name}</p>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={opp.status} />
                    <p className="text-sm text-gray-600 mt-1">
                      {formatCurrency(opp.expected_amount)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 거래처 목록 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <Building2 size={18} />
              거래처
            </h2>
            <button
              onClick={() => navigate("/sales/clients")}
              className="text-sm text-blue-600 hover:underline flex items-center gap-1"
            >
              전체 보기 <ChevronRight size={14} />
            </button>
          </div>
          <div className="space-y-3">
            {loading ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent" />
              </div>
            ) : clients.length === 0 ? (
              <p className="text-center py-4 text-gray-400">등록된 거래처가 없습니다.</p>
            ) : (
              clients.slice(0, 5).map((client) => (
                <div
                  key={client.id}
                  onClick={() => navigate(`/sales/clients/${client.id}`)}
                  className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Building2 size={18} className="text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{client.name}</p>
                      <p className="text-sm text-gray-500">
                        {client.industry || "업종 미지정"}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500">
                    {client.opportunity_count || 0}건
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 미수금 현황 */}
      {receivable?.by_client?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <DollarSign size={18} />
              거래처별 미수금 현황
            </h2>
            <button
              onClick={() => navigate("/sales/invoices")}
              className="text-sm text-blue-600 hover:underline flex items-center gap-1"
            >
              전체 보기 <ChevronRight size={14} />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">거래처</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">청구 건수</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">미수금</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">연체</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {receivable.by_client.slice(0, 5).map((item) => (
                  <tr key={item.client_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{item.client_name}</td>
                    <td className="px-4 py-3 text-right">{item.invoice_count}건</td>
                    <td className="px-4 py-3 text-right font-medium text-orange-600">
                      {formatCurrency(item.total_balance)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {item.overdue_count > 0 && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-600">
                          {item.overdue_count}건
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
