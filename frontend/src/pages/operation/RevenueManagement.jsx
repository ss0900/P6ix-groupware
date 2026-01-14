// src/pages/operation/RevenueManagement.jsx
/**
 * 매출/수금 관리
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FiDollarSign, FiPlus, FiRefreshCw, FiEdit2, FiTrash2 } from "react-icons/fi";
import { RevenueService, SalesService } from "../../api/operation";
import Modal from "../../components/common/ui/Modal";

function RevenueManagement() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [milestones, setMilestones] = useState([]);
  const [collections, setCollections] = useState([]);
  const [leads, setLeads] = useState([]);

  const [milestoneModal, setMilestoneModal] = useState(false);
  const [collectionModal, setCollectionModal] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState(null);
  const [editingCollection, setEditingCollection] = useState(null);

  const [milestoneForm, setMilestoneForm] = useState({
    lead: "",
    contract_id: "",
    title: "",
    planned_amount: "",
    planned_date: "",
    status: "planned",
    notes: "",
  });

  const [collectionForm, setCollectionForm] = useState({
    lead: "",
    milestone: "",
    amount: "",
    due_date: "",
    received_at: "",
    status: "planned",
    notes: "",
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryData, milestoneData, collectionData, leadData] = await Promise.all([
        RevenueService.getSummary(),
        RevenueService.getMilestones(),
        RevenueService.getCollections(),
        SalesService.getLeads({ status: "active" }),
      ]);

      setSummary(summaryData);
      setMilestones(milestoneData.results || milestoneData);
      setCollections(collectionData.results || collectionData);
      setLeads(leadData.results || leadData);
    } catch (error) {
      console.error("Error fetching revenue data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatAmount = (amount) => {
    if (!amount) return "-";
    return new Intl.NumberFormat("ko-KR").format(amount) + "원";
  };

  const statusLabels = {
    planned: { label: "계획", color: "bg-blue-100 text-blue-700" },
    invoiced: { label: "청구", color: "bg-amber-100 text-amber-700" },
    collected: { label: "수금완료", color: "bg-green-100 text-green-700" },
    received: { label: "수금완료", color: "bg-green-100 text-green-700" },
    overdue: { label: "미수", color: "bg-red-100 text-red-700" },
  };

  const milestoneOptions = useMemo(
    () => milestones.map((m) => ({ id: m.id, label: m.title })),
    [milestones]
  );

  const openMilestoneModal = (milestone = null) => {
    setEditingMilestone(milestone);
    setMilestoneForm({
      lead: milestone?.lead || "",
      contract_id: milestone?.contract_id || "",
      title: milestone?.title || "",
      planned_amount: milestone?.planned_amount || "",
      planned_date: milestone?.planned_date || "",
      status: milestone?.status || "planned",
      notes: milestone?.notes || "",
    });
    setMilestoneModal(true);
  };

  const openCollectionModal = (collection = null) => {
    setEditingCollection(collection);
    setCollectionForm({
      lead: collection?.lead || "",
      milestone: collection?.milestone || "",
      amount: collection?.amount || "",
      due_date: collection?.due_date || "",
      received_at: collection?.received_at ? collection.received_at.slice(0, 16) : "",
      status: collection?.status || "planned",
      notes: collection?.notes || "",
    });
    setCollectionModal(true);
  };

  const handleSaveMilestone = async (e) => {
    e.preventDefault();
    const payload = {
      ...milestoneForm,
      lead: milestoneForm.lead || null,
      contract_id: milestoneForm.contract_id || null,
      planned_amount: milestoneForm.planned_amount || null,
      planned_date: milestoneForm.planned_date || null,
    };

    try {
      if (editingMilestone) {
        await RevenueService.updateMilestone(editingMilestone.id, payload);
      } else {
        await RevenueService.createMilestone(payload);
      }
      setMilestoneModal(false);
      fetchData();
    } catch (error) {
      console.error("Error saving milestone:", error);
    }
  };

  const handleSaveCollection = async (e) => {
    e.preventDefault();
    const payload = {
      ...collectionForm,
      lead: collectionForm.lead || null,
      milestone: collectionForm.milestone || null,
      amount: collectionForm.amount || null,
      due_date: collectionForm.due_date || null,
      received_at: collectionForm.received_at || null,
    };

    try {
      if (editingCollection) {
        await RevenueService.updateCollection(editingCollection.id, payload);
      } else {
        await RevenueService.createCollection(payload);
      }
      setCollectionModal(false);
      fetchData();
    } catch (error) {
      console.error("Error saving collection:", error);
    }
  };

  const handleDeleteMilestone = async (id) => {
    if (!window.confirm("매출 계획을 삭제하시겠습니까?")) return;
    try {
      await RevenueService.deleteMilestone(id);
      fetchData();
    } catch (error) {
      console.error("Error deleting milestone:", error);
    }
  };

  const handleDeleteCollection = async (id) => {
    if (!window.confirm("수금을 삭제하시겠습니까?")) return;
    try {
      await RevenueService.deleteCollection(id);
      fetchData();
    } catch (error) {
      console.error("Error deleting collection:", error);
    }
  };

  const summaryCards = [
    { label: "예정 합계", value: summary?.planned_total },
    { label: "청구 합계", value: summary?.invoiced_total },
    { label: "수금 완료", value: summary?.collected_total },
    { label: "실수금", value: summary?.received_total },
    { label: "미수금", value: summary?.outstanding_total },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FiDollarSign className="w-6 h-6 text-blue-600" />
          <h1 className="text-title">매출/수금</h1>
        </div>
        <button onClick={fetchData} className="btn-secondary flex items-center gap-2">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {summaryCards.map((card) => (
              <div key={card.label} className="page-box">
                <p className="text-sm text-gray-500">{card.label}</p>
                <p className="text-lg font-semibold text-gray-900">
                  {formatAmount(card.value)}
                </p>
              </div>
            ))}
          </div>

          <div className="page-box">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-700">매출 계획</h3>
              <button
                onClick={() => openMilestoneModal()}
                className="btn-create-sm flex items-center gap-1"
              >
                <FiPlus className="w-3 h-3" />
                추가
              </button>
            </div>

            {milestones.length === 0 ? (
              <p className="text-center text-gray-500 py-8">매출 계획이 없습니다.</p>
            ) : (
              <table className="w-full">
                <thead className="doc-thead">
                  <tr>
                    <th className="doc-th text-left">항목</th>
                    <th className="doc-th text-center">상태</th>
                    <th className="doc-th text-center">예정일</th>
                    <th className="doc-th text-right">예정금액</th>
                    <th className="doc-th-end text-center">관리</th>
                  </tr>
                </thead>
                <tbody>
                  {milestones.map((item) => (
                    <tr key={item.id} className="border-b border-gray-100">
                      <td className="px-3 py-3 text-sm">
                        <div className="font-medium text-gray-900">{item.title}</div>
                        <div className="text-xs text-gray-500">{item.lead_title || "-"}</div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            statusLabels[item.status]?.color || "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {statusLabels[item.status]?.label || item.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-sm text-center">
                        {item.planned_date || "-"}
                      </td>
                      <td className="px-3 py-3 text-sm text-right">
                        {formatAmount(item.planned_amount)}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <button
                          onClick={() => openMilestoneModal(item)}
                          className="p-1 text-gray-500 hover:bg-gray-100 rounded"
                        >
                          <FiEdit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteMilestone(item.id)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="page-box">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-700">수금</h3>
              <button
                onClick={() => openCollectionModal()}
                className="btn-create-sm flex items-center gap-1"
              >
                <FiPlus className="w-3 h-3" />
                추가
              </button>
            </div>

            {collections.length === 0 ? (
              <p className="text-center text-gray-500 py-8">수금 정보가 없습니다.</p>
            ) : (
              <table className="w-full">
                <thead className="doc-thead">
                  <tr>
                    <th className="doc-th text-left">연관</th>
                    <th className="doc-th text-center">상태</th>
                    <th className="doc-th text-center">수금 예정일</th>
                    <th className="doc-th text-right">금액</th>
                    <th className="doc-th-end text-center">관리</th>
                  </tr>
                </thead>
                <tbody>
                  {collections.map((item) => (
                    <tr key={item.id} className="border-b border-gray-100">
                      <td className="px-3 py-3 text-sm">
                        <div className="font-medium text-gray-900">
                          {item.milestone_title || "일반 수금"}
                        </div>
                        <div className="text-xs text-gray-500">{item.lead_title || "-"}</div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            statusLabels[item.status]?.color || "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {statusLabels[item.status]?.label || item.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-sm text-center">{item.due_date || "-"}</td>
                      <td className="px-3 py-3 text-sm text-right">{formatAmount(item.amount)}</td>
                      <td className="px-3 py-3 text-center">
                        <button
                          onClick={() => openCollectionModal(item)}
                          className="p-1 text-gray-500 hover:bg-gray-100 rounded"
                        >
                          <FiEdit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCollection(item.id)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* 매출 계획 모달 */}
      <Modal
        isOpen={milestoneModal}
        onClose={() => setMilestoneModal(false)}
        title={editingMilestone ? "매출 계획 수정" : "매출 계획 추가"}
      >
        <form onSubmit={handleSaveMilestone} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">항목명</label>
            <input
              className="input-base"
              value={milestoneForm.title}
              onChange={(e) => setMilestoneForm({ ...milestoneForm, title: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">연관 리드</label>
            <select
              className="input-base"
              value={milestoneForm.lead}
              onChange={(e) => setMilestoneForm({ ...milestoneForm, lead: e.target.value })}
            >
              <option value="">선택</option>
              {leads.map((lead) => (
                <option key={lead.id} value={lead.id}>
                  {lead.title}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">계약 ID</label>
              <input
                className="input-base"
                value={milestoneForm.contract_id}
                onChange={(e) => setMilestoneForm({ ...milestoneForm, contract_id: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">상태</label>
              <select
                className="input-base"
                value={milestoneForm.status}
                onChange={(e) => setMilestoneForm({ ...milestoneForm, status: e.target.value })}
              >
                <option value="planned">계획</option>
                <option value="invoiced">청구</option>
                <option value="collected">수금완료</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">예정금액</label>
              <input
                type="number"
                className="input-base"
                value={milestoneForm.planned_amount}
                onChange={(e) => setMilestoneForm({ ...milestoneForm, planned_amount: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">예정일</label>
              <input
                type="date"
                className="input-base"
                value={milestoneForm.planned_date}
                onChange={(e) => setMilestoneForm({ ...milestoneForm, planned_date: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">비고</label>
            <textarea
              className="input-base"
              rows={3}
              value={milestoneForm.notes}
              onChange={(e) => setMilestoneForm({ ...milestoneForm, notes: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setMilestoneModal(false)} className="btn-cancel">
              취소
            </button>
            <button type="submit" className="btn-save">
              저장
            </button>
          </div>
        </form>
      </Modal>

      {/* 수금 모달 */}
      <Modal
        isOpen={collectionModal}
        onClose={() => setCollectionModal(false)}
        title={editingCollection ? "수금 수정" : "수금 추가"}
      >
        <form onSubmit={handleSaveCollection} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">연관 리드</label>
            <select
              className="input-base"
              value={collectionForm.lead}
              onChange={(e) => setCollectionForm({ ...collectionForm, lead: e.target.value })}
            >
              <option value="">선택</option>
              {leads.map((lead) => (
                <option key={lead.id} value={lead.id}>
                  {lead.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">매출 계획</label>
            <select
              className="input-base"
              value={collectionForm.milestone}
              onChange={(e) => setCollectionForm({ ...collectionForm, milestone: e.target.value })}
            >
              <option value="">선택</option>
              {milestoneOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">금액</label>
              <input
                type="number"
                className="input-base"
                value={collectionForm.amount}
                onChange={(e) => setCollectionForm({ ...collectionForm, amount: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">상태</label>
              <select
                className="input-base"
                value={collectionForm.status}
                onChange={(e) => setCollectionForm({ ...collectionForm, status: e.target.value })}
              >
                <option value="planned">예정</option>
                <option value="received">수금완료</option>
                <option value="overdue">미수</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">수금 예정일</label>
              <input
                type="date"
                className="input-base"
                value={collectionForm.due_date}
                onChange={(e) => setCollectionForm({ ...collectionForm, due_date: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">수금일</label>
              <input
                type="datetime-local"
                className="input-base"
                value={collectionForm.received_at}
                onChange={(e) => setCollectionForm({ ...collectionForm, received_at: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">비고</label>
            <textarea
              className="input-base"
              rows={3}
              value={collectionForm.notes}
              onChange={(e) => setCollectionForm({ ...collectionForm, notes: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setCollectionModal(false)} className="btn-cancel">
              취소
            </button>
            <button type="submit" className="btn-save">
              저장
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default RevenueManagement;
