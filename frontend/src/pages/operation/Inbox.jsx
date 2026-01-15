// src/pages/operation/Inbox.jsx
/**
 * 영업접수함 - 신규/미배정 리드
 */
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FiInbox, FiUser, FiCalendar, FiArrowRight } from "react-icons/fi";
import { SalesService } from "../../api/operation";
import { fetchUsers } from "../../api/users/user";
import Modal from "../../components/common/ui/Modal";

function Inbox() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [stageOptions, setStageOptions] = useState([]);
  const [acceptForm, setAcceptForm] = useState({
    stage_id: "",
    owner_id: "",
    note: "",
    create_task: true,
    task_title: "다음 액션",
    task_due_date: "",
    task_priority: "medium",
    task_assignee_id: "",
  });

  const fetchInbox = useCallback(async () => {
    setLoading(true);
    try {
      const data = await SalesService.getInbox();
      setLeads(data);
    } catch (error) {
      console.error("Error fetching inbox:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      const res = await fetchUsers();
      const list = res.data?.results ?? res.data ?? [];
      setUsers(list);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  }, []);

  useEffect(() => {
    fetchInbox();
  }, [fetchInbox]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("ko-KR");
  };

  const formatAmount = (amount) => {
    if (!amount) return "-";
    return new Intl.NumberFormat("ko-KR").format(amount) + "원";
  };

  const getUserLabel = (user) => {
    const name = `${user.last_name ?? ""}${user.first_name ?? ""}`.trim();
    return name || user.username || user.email || `사용자${user.id}`;
  };

  const openAccept = async (lead, e) => {
    e?.stopPropagation();
    setSelectedLead(lead);
    setAcceptOpen(true);
    setAcceptForm((prev) => ({
      ...prev,
      stage_id: "",
      note: "",
      owner_id: lead.owner || "",
      task_assignee_id: lead.owner || "",
    }));
    try {
      if (lead.pipeline) {
        const stages = await SalesService.getStages(lead.pipeline);
        setStageOptions(stages);
      } else {
        setStageOptions([]);
      }
    } catch (err) {
      console.error(err);
      setStageOptions([]);
    }
  };

  const submitAccept = async (e) => {
    e.preventDefault();
    if (!selectedLead) return;
    if (acceptForm.create_task && !acceptForm.task_title.trim()) {
      alert("TODO 제목을 입력해주세요.");
      return;
    }
    try {
      const payload = {
        stage_id: acceptForm.stage_id || null,
        owner_id: acceptForm.owner_id || null,
        note: acceptForm.note,
        create_task: acceptForm.create_task,
      };
      if (acceptForm.create_task) {
        payload.task_title = acceptForm.task_title;
        payload.task_due_date = acceptForm.task_due_date || null;
        payload.task_priority = acceptForm.task_priority;
        payload.task_assignee_id = acceptForm.task_assignee_id || null;
      }
      const leadId = selectedLead.id;
      await SalesService.acceptInbox(leadId, payload);
      setAcceptOpen(false);
      setSelectedLead(null);
      navigate(`/operation/sales/leads/${leadId}`);
    } catch (err) {
      console.error(err);
      alert("접수 처리 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FiInbox className="w-6 h-6 text-blue-600" />
        <h1 className="text-title">영업접수</h1>
      </div>

      <p className="text-muted-sm">
        담당자 미배정 또는 첫 단계에 머무는 신규 영업기회입니다.
      </p>

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
                onClick={() => navigate(`/operation/sales/leads/${lead.id}`)}
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
                  <button
                    onClick={(e) => openAccept(lead, e)}
                    className="px-3 py-1 rounded-lg text-sm border border-gray-200 hover:bg-gray-100"
                  >
                    접수 처리
                  </button>
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

      <Modal
        isOpen={acceptOpen}
        onClose={() => setAcceptOpen(false)}
        title="접수 처리"
        size="md"
      >
        <form onSubmit={submitAccept} className="space-y-4">
          <div className="text-sm text-gray-700">
            <div className="font-medium">{selectedLead?.title}</div>
            <div className="text-gray-500">{selectedLead?.company_name || "-"}</div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              담당자 지정
            </label>
            <select
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              value={acceptForm.owner_id}
              onChange={(e) =>
                setAcceptForm((p) => ({ ...p, owner_id: e.target.value }))
              }
            >
              <option value="">(미지정)</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {getUserLabel(user)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              이동할 단계 (선택)
            </label>
            <select
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              value={acceptForm.stage_id}
              onChange={(e) =>
                setAcceptForm((p) => ({ ...p, stage_id: e.target.value }))
              }
            >
              <option value="">(미선택 시 다음 단계 이동)</option>
              {stageOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              메모 (선택)
            </label>
            <textarea
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              rows={3}
              value={acceptForm.note}
              onChange={(e) => setAcceptForm((p) => ({ ...p, note: e.target.value }))}
              placeholder="접수 메모를 남기면 활동 로그에 기록됩니다."
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={acceptForm.create_task}
              onChange={(e) =>
                setAcceptForm((p) => ({ ...p, create_task: e.target.checked }))
              }
            />
            <span className="text-sm text-gray-700">다음 액션 TODO 생성</span>
          </div>

          {acceptForm.create_task && (
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  TODO 제목
                </label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  value={acceptForm.task_title}
                  onChange={(e) =>
                    setAcceptForm((p) => ({ ...p, task_title: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  기한
                </label>
                <input
                  type="datetime-local"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  value={acceptForm.task_due_date}
                  onChange={(e) =>
                    setAcceptForm((p) => ({ ...p, task_due_date: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  담당자
                </label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  value={acceptForm.task_assignee_id}
                  onChange={(e) =>
                    setAcceptForm((p) => ({ ...p, task_assignee_id: e.target.value }))
                  }
                >
                  <option value="">(미지정)</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {getUserLabel(user)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setAcceptOpen(false)}
              className="btn-secondary"
            >
              취소
            </button>
            <button type="submit" className="btn-primary">
              접수 완료
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default Inbox;
