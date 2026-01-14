// src/pages/sales/InvoiceList.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { invoiceApi } from "../../api/salesApi";
import { useUrlFilter } from "../../hooks/useUrlFilter";
import useResponsiveView from "../../hooks/useResponsiveView";
import {
  Plus,
  Search,
  FileText,
  AlertTriangle,
  LayoutGrid,
  List,
} from "lucide-react";

// 숫자 포맷
const formatCurrency = (value) => {
  if (!value) return "₩0";
  return `₩${Number(value).toLocaleString()}`;
};

// 상태 뱃지
const StatusBadge = ({ status }) => {
  const config = {
    draft: { bg: "bg-gray-100", text: "text-gray-600", label: "작성중" },
    sent: { bg: "bg-blue-100", text: "text-blue-600", label: "발송" },
    partial: { bg: "bg-yellow-100", text: "text-yellow-600", label: "부분납" },
    paid: { bg: "bg-green-100", text: "text-green-600", label: "완납" },
    overdue: { bg: "bg-red-100", text: "text-red-600", label: "연체" },
    cancelled: { bg: "bg-gray-100", text: "text-gray-400", label: "취소" },
  };
  const c = config[status] || config.draft;
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
};

export default function InvoiceList() {
  const navigate = useNavigate();
  const { filters, setFilter, toApiParams } = useUrlFilter();
  const { viewMode, toggleView, isMobile } = useResponsiveView();

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // 데이터 로드
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = toApiParams();
      const res = await invoiceApi.getList(params);
      setInvoices(res.data?.results ?? res.data ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [toApiParams]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const statuses = [
    { value: "", label: "전체" },
    { value: "sent", label: "발송" },
    { value: "partial", label: "부분납" },
    { value: "overdue", label: "연체" },
    { value: "paid", label: "완납" },
  ];

  // 카드 렌더러
  const renderCard = (invoice) => (
    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-medium text-gray-900">{invoice.invoice_number}</p>
          <p className="text-sm text-gray-500">{invoice.client_name}</p>
        </div>
        <StatusBadge status={invoice.status} />
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-gray-500">청구액</p>
          <p className="font-medium">{formatCurrency(invoice.total)}</p>
        </div>
        <div>
          <p className="text-gray-500">미수금</p>
          <p className="font-medium text-orange-600">
            {formatCurrency(invoice.balance)}
          </p>
        </div>
        <div>
          <p className="text-gray-500">납부기한</p>
          <p className="font-medium">
            {new Date(invoice.due_date).toLocaleDateString("ko-KR")}
          </p>
        </div>
        <div>
          <p className="text-gray-500">연체일수</p>
          <p className={`font-medium ${invoice.overdue_days > 0 ? "text-red-600" : ""}`}>
            {invoice.overdue_days > 0 ? `${invoice.overdue_days}일` : "-"}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileText size={24} />
          청구서 관리
        </h1>
        <div className="flex items-center gap-2">
          {!isMobile && (
            <button
              onClick={toggleView}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              {viewMode === "table" ? <LayoutGrid size={18} /> : <List size={18} />}
            </button>
          )}
          <button
            onClick={() => navigate("/sales/invoices/new")}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">청구서 작성</span>
          </button>
        </div>
      </div>

      {/* 필터 탭 */}
      <div className="flex items-center gap-2 border-b border-gray-200 overflow-x-auto no-scrollbar">
        {statuses.map((s) => (
          <button
            key={s.value}
            onClick={() => setFilter("status", s.value)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
              (filters.status || "") === s.value
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {s.label}
          </button>
        ))}
        {/* 연체만 필터 */}
        <button
          onClick={() => setFilter("overdue", filters.overdue === "true" ? "" : "true")}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap flex items-center gap-1 ${
            filters.overdue === "true"
              ? "border-red-600 text-red-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <AlertTriangle size={14} />
          연체만
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        {/* 검색 */}
        <div className="p-4 border-b border-gray-100">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="청구번호, 거래처 검색..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        {/* 데이터 표시 */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            청구서가 없습니다.
          </div>
        ) : viewMode === "table" && !isMobile ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">청구번호</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">거래처</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">상태</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">청구액</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">수금액</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">미수금</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">납부기한</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">연체</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoices.map((invoice) => (
                  <tr
                    key={invoice.id}
                    onClick={() => navigate(`/sales/invoices/${invoice.id}`)}
                    className="hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {invoice.invoice_number}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{invoice.client_name}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={invoice.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatCurrency(invoice.total)}
                    </td>
                    <td className="px-4 py-3 text-right text-green-600">
                      {formatCurrency(invoice.paid_amount)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-orange-600">
                      {formatCurrency(invoice.balance)}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">
                      {new Date(invoice.due_date).toLocaleDateString("ko-KR")}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {invoice.overdue_days > 0 && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-600">
                          {invoice.overdue_days}일
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {invoices.map((invoice) => (
              <div
                key={invoice.id}
                onClick={() => navigate(`/sales/invoices/${invoice.id}`)}
                className="cursor-pointer"
              >
                {renderCard(invoice)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
