// src/pages/sales/ContractForm.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/axios";
import { ArrowLeft, Save } from "lucide-react";

export default function ContractForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState([]);
  const [opportunities, setOpportunities] = useState([]);

  const [formData, setFormData] = useState({
    client: "",
    opportunity: "",
    title: "",
    status: "draft",
    amount: "",
    start_date: "",
    end_date: "",
    notes: "",
  });

  // 거래처/영업기회 로드
  useEffect(() => {
    (async () => {
      try {
        const [clientsRes, oppsRes] = await Promise.all([
          api.get("operation/clients/"),
          api.get("operation/opportunities/"),
        ]);
        setClients(clientsRes.data?.results ?? clientsRes.data ?? []);
        setOpportunities(oppsRes.data?.results ?? oppsRes.data ?? []);
      } catch (err) {
        console.error(err);
      }
    })();
  }, []);

  // 편집 모드
  useEffect(() => {
    if (!isEdit) return;

    setLoading(true);
    (async () => {
      try {
        const res = await api.get(`operation/contracts/${id}/`);
        setFormData(res.data);
      } catch (err) {
        console.error(err);
        alert("데이터를 불러올 수 없습니다.");
        navigate("/sales/contracts");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isEdit, navigate]);

  // 저장
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.client) {
      alert("거래처를 선택해주세요.");
      return;
    }
    if (!formData.title.trim()) {
      alert("제목을 입력해주세요.");
      return;
    }

    setSaving(true);
    try {
      const payload = { ...formData };
      if (!payload.opportunity) delete payload.opportunity;

      if (isEdit) {
        await api.patch(`operation/contracts/${id}/`, payload);
      } else {
        await api.post("operation/contracts/", payload);
      }
      navigate("/sales/contracts");
    } catch (err) {
      console.error(err);
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate("/sales/contracts")} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">{isEdit ? "계약 수정" : "계약 등록"}</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
        {/* 거래처 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">거래처 *</label>
          <select
            value={formData.client}
            onChange={(e) => setFormData({ ...formData, client: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            required
          >
            <option value="">선택해주세요</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* 연결된 영업 기회 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">영업 기회 (선택)</label>
          <select
            value={formData.opportunity}
            onChange={(e) => setFormData({ ...formData, opportunity: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">선택 안함</option>
            {opportunities.map((o) => (
              <option key={o.id} value={o.id}>{o.title}</option>
            ))}
          </select>
        </div>

        {/* 제목 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">계약 제목 *</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="계약 제목"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* 상태 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">상태</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="draft">작성중</option>
              <option value="pending">검토중</option>
              <option value="active">진행중</option>
              <option value="completed">완료</option>
              <option value="terminated">해지</option>
            </select>
          </div>

          {/* 금액 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">계약 금액 (원)</label>
            <input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        {/* 계약 기간 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">시작일</label>
            <input
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">종료일</label>
            <input
              type="date"
              value={formData.end_date}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        {/* 비고 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">비고</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
          />
        </div>

        {/* 버튼 */}
        <div className="flex gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={() => navigate("/sales/contracts")}
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium"
          >
            <Save size={18} />
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </form>
    </div>
  );
}
