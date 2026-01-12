// src/pages/sales/SalesDashboard.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { 
  TrendingUp, 
  Building2, 
  FileText, 
  Receipt,
  Plus,
  DollarSign,
  Target,
  Users,
  ChevronRight,
  BarChart3
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

export default function SalesDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [opportunities, setOpportunities] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  // 데이터 로드
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, oppsRes, clientsRes] = await Promise.all([
        api.get("operation/opportunities/stats/"),
        api.get("operation/opportunities/?limit=5"),
        api.get("operation/clients/?limit=5"),
      ]);
      setStats(statsRes.data);
      setOpportunities(oppsRes.data?.results ?? oppsRes.data ?? []);
      setClients(clientsRes.data?.results ?? clientsRes.data ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 파이프라인 계산
  const pipelineByStatus = stats?.by_status?.reduce((acc, item) => {
    acc[item.status] = item;
    return acc;
  }, {}) || {};

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">영업관리</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/sales/clients/new")}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Building2 size={18} />
            거래처 등록
          </button>
          <button
            onClick={() => navigate("/sales/opportunities/new")}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus size={18} />
            영업 기회 등록
          </button>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">진행중 파이프라인</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(stats?.pipeline?.total)}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <TrendingUp size={24} className="text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">이번 달 수주</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(stats?.won_this_month?.amount)}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <Target size={24} className="text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">수주 건수</p>
              <p className="text-2xl font-bold text-purple-600">
                {stats?.won_this_month?.count || 0}건
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <FileText size={24} className="text-purple-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">거래처</p>
              <p className="text-2xl font-bold text-orange-600">
                {clients.length}개
              </p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <Building2 size={24} className="text-orange-600" />
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
        <div className="flex items-center gap-2">
          {["lead", "contact", "proposal", "negotiation", "won"].map((status) => {
            const data = pipelineByStatus[status] || { count: 0, total_amount: 0 };
            const statusLabels = {
              lead: "리드",
              contact: "접촉",
              proposal: "제안",
              negotiation: "협상",
              won: "수주",
            };
            return (
              <div key={status} className="flex-1 text-center">
                <div className={`h-3 rounded-full ${
                  status === "won" ? "bg-green-500" :
                  status === "negotiation" ? "bg-purple-500" :
                  status === "proposal" ? "bg-yellow-500" :
                  status === "contact" ? "bg-blue-500" : "bg-gray-400"
                }`} />
                <p className="text-xs text-gray-500 mt-2">{statusLabels[status]}</p>
                <p className="font-semibold">{data.count || 0}건</p>
                <p className="text-xs text-gray-400">{formatCurrency(data.total_amount)}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
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
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
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
                    <p className="font-medium text-gray-900">{opp.title}</p>
                    <p className="text-sm text-gray-500">{opp.client_name}</p>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={opp.status} />
                    <p className="text-sm text-gray-600 mt-1">{formatCurrency(opp.expected_amount)}</p>
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
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
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
                      <p className="text-sm text-gray-500">{client.industry || "업종 미지정"}</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500">{client.opportunity_count || 0}건</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
