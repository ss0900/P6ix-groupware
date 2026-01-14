// src/pages/operation/SalesDashboard.jsx
/**
 * 영업 대시보드
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiRefreshCw,
  FiTrendingUp,
  FiDollarSign,
  FiAlertCircle,
  FiClock,
} from "react-icons/fi";
import { SalesService } from "../../api/operation";

function SalesDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    try {
      const data = await SalesService.getDashboard();
      setSummary(data);
    } catch (error) {
      console.error("Error fetching sales dashboard:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const formatAmount = (amount) => {
    if (!amount) return "-";
    return new Intl.NumberFormat("ko-KR").format(amount) + "원";
  };

  const stageGroups = useMemo(() => {
    const stats = summary?.stage_stats || [];
    return stats.reduce((acc, stat) => {
      const key = stat.pipeline_name || "기본 파이프라인";
      if (!acc[key]) acc[key] = [];
      acc[key].push(stat);
      return acc;
    }, {});
  }, [summary]);

  const kpiCards = [
    {
      label: "이번달 신규",
      value: summary?.this_month_new ?? 0,
      icon: FiTrendingUp,
      color: "bg-blue-50 text-blue-700",
    },
    {
      label: "진행중",
      value: summary?.active ?? 0,
      icon: FiClock,
      color: "bg-amber-50 text-amber-700",
    },
    {
      label: "수주",
      value: summary?.won ?? 0,
      icon: FiDollarSign,
      color: "bg-green-50 text-green-700",
    },
    {
      label: "실주",
      value: summary?.lost ?? 0,
      icon: FiAlertCircle,
      color: "bg-red-50 text-red-700",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FiTrendingUp className="w-6 h-6 text-blue-600" />
          <h1 className="text-title">영업 대시보드</h1>
        </div>
        <button onClick={fetchSummary} className="btn-secondary flex items-center gap-2">
          <FiRefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          새로고침
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {kpiCards.map((card) => (
              <div key={card.label} className="page-box flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{card.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                </div>
                <div className={`p-3 rounded-lg ${card.color}`}>
                  <card.icon className="w-5 h-5" />
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 page-box">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-700">단계별 전환</h3>
                <div className="text-sm text-gray-500">
                  예상 매출 합계: {formatAmount(summary?.total_amount)}
                </div>
              </div>
              {Object.keys(stageGroups).length === 0 ? (
                <p className="text-center text-gray-500 py-8">단계 데이터가 없습니다.</p>
              ) : (
                <div className="space-y-4">
                  {Object.entries(stageGroups).map(([pipelineName, stages]) => (
                    <div key={pipelineName} className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="px-3 py-2 bg-gray-50 text-sm font-medium text-gray-700">
                        {pipelineName}
                      </div>
                      <table className="w-full">
                        <thead className="doc-thead">
                          <tr>
                            <th className="doc-th text-left">단계</th>
                            <th className="doc-th text-center">건수</th>
                            <th className="doc-th-end text-center">전환율</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stages
                            .sort((a, b) => a.order - b.order)
                            .map((stage) => (
                              <tr key={stage.stage_id} className="border-b border-gray-100">
                                <td className="px-3 py-2 text-sm">{stage.stage_name}</td>
                                <td className="px-3 py-2 text-sm text-center">{stage.lead_count}</td>
                                <td className="px-3 py-2 text-sm text-center">
                                  {stage.conversion_rate == null ? "-" : `${stage.conversion_rate}%`}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="page-box">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">지연 리드 TOP</h3>
              {summary?.stalled_leads?.length ? (
                <div className="space-y-3">
                  {summary.stalled_leads.map((lead) => (
                    <div
                      key={lead.id}
                      onClick={() => navigate(`/operation/sales/leads/${lead.id}`)}
                      className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-gray-900">{lead.title}</p>
                        <span className="text-xs text-orange-600">
                          {lead.stalled_days}일
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{lead.stage_name || "-"}</span>
                        <span>{formatAmount(lead.expected_amount)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">지연 리드가 없습니다.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default SalesDashboard;
