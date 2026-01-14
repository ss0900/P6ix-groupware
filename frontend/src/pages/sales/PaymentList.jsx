// src/pages/sales/PaymentList.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { paymentApi } from "../../api/salesApi";
import { useUrlFilter } from "../../hooks/useUrlFilter";
import { Plus, Search, DollarSign, Calendar } from "lucide-react";

// 숫자 포맷
const formatCurrency = (value) => {
  if (!value) return "₩0";
  return `₩${Number(value).toLocaleString()}`;
};

// 결제 방법 뱃지
const PaymentMethodBadge = ({ method }) => {
  const config = {
    bank_transfer: { label: "계좌이체", bg: "bg-blue-100", text: "text-blue-600" },
    cash: { label: "현금", bg: "bg-green-100", text: "text-green-600" },
    card: { label: "카드", bg: "bg-purple-100", text: "text-purple-600" },
    check: { label: "수표", bg: "bg-yellow-100", text: "text-yellow-600" },
    other: { label: "기타", bg: "bg-gray-100", text: "text-gray-600" },
  };
  const c = config[method] || config.other;
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
};

export default function PaymentList() {
  const navigate = useNavigate();
  const { filters, setFilter, toApiParams } = useUrlFilter();

  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  // 데이터 로드
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = toApiParams();
      const res = await paymentApi.getList(params);
      setPayments(res.data?.results ?? res.data ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [toApiParams]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <DollarSign size={24} />
          수금 기록
        </h1>
        <button
          onClick={() => navigate("/sales/payments/new")}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={18} />
          <span className="hidden sm:inline">수금 등록</span>
        </button>
      </div>

      {/* 필터 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar size={16} />
            <span>기간:</span>
          </div>
          <input
            type="date"
            value={filters.start_date || ""}
            onChange={(e) => setFilter("start_date", e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
          />
          <span className="text-gray-400">~</span>
          <input
            type="date"
            value={filters.end_date || ""}
            onChange={(e) => setFilter("end_date", e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
          </div>
        ) : payments.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            수금 기록이 없습니다.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">입금일</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">청구번호</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">입금액</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">결제방법</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">참조번호</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">등록자</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900">
                      {new Date(payment.payment_date).toLocaleDateString("ko-KR")}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => navigate(`/sales/invoices/${payment.invoice}`)}
                        className="text-blue-600 hover:underline"
                      >
                        {payment.invoice_number}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-green-600">
                      {formatCurrency(payment.amount)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <PaymentMethodBadge method={payment.payment_method} />
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {payment.reference || "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {payment.created_by_name}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 합계 */}
      {payments.length > 0 && (
        <div className="bg-green-50 rounded-xl p-4 flex justify-between items-center">
          <span className="text-green-700 font-medium">총 수금액</span>
          <span className="text-2xl font-bold text-green-600">
            {formatCurrency(payments.reduce((sum, p) => sum + Number(p.amount), 0))}
          </span>
        </div>
      )}
    </div>
  );
}
