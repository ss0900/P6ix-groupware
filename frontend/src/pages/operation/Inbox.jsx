// src/pages/operation/Inbox.jsx
/**
 * 영업접수함 - 신규/미배정 리드
 */
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiInbox, FiUser, FiCalendar, FiArrowRight } from "react-icons/fi";
import { SalesService } from "../../api/operation";

function Inbox() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInbox = async () => {
      setLoading(true);
      try {
        const data = await SalesService.getInbox();
        setLeads(data);
      } catch (error) {
        console.error("Error fetching inbox:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchInbox();
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("ko-KR");
  };

  const formatAmount = (amount) => {
    if (!amount) return "-";
    return new Intl.NumberFormat("ko-KR").format(amount) + "원";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <FiInbox className="w-6 h-6 text-blue-600" />
        <h1 className="text-title">영업접수</h1>
      </div>

      <p className="text-muted-sm">
        담당자가 미배정되었거나 첫 단계에 있는 신규 영업기회입니다.
      </p>

      {/* List */}
      <div className="page-box">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
          </div>
        ) : leads.length === 0 ? (
          <div className="text-center py-12">
            <FiInbox className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">접수할 영업기회가 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {leads.map((lead) => (
              <div
                key={lead.id}
                onClick={() => navigate(`/operation/leads/${lead.id}`)}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span
                      className="px-2 py-1 rounded text-xs font-medium"
                      style={{
                        backgroundColor: lead.stage_color + "20",
                        color: lead.stage_color,
                      }}
                    >
                      {lead.stage_name}
                    </span>
                    <h3 className="font-medium text-gray-900">{lead.title}</h3>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    {lead.company_name && <span>{lead.company_name}</span>}
                    <span className="flex items-center gap-1">
                      <FiCalendar className="w-4 h-4" />
                      {formatDate(lead.created_at)}
                    </span>
                    <span>{formatAmount(lead.expected_amount)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {lead.owner_name ? (
                    <span className="flex items-center gap-1 text-sm text-gray-600">
                      <FiUser className="w-4 h-4" />
                      {lead.owner_name}
                    </span>
                  ) : (
                    <span className="text-sm text-orange-500">담당자 미배정</span>
                  )}
                  <FiArrowRight className="w-5 h-5 text-gray-400" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Inbox;
