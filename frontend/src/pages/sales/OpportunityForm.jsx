// src/pages/sales/OpportunityForm.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/axios";
import { ArrowLeft, Save } from "lucide-react";

export default function OpportunityForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState([]);

  const [formData, setFormData] = useState({
    title: "",
    client: "",
    status: "lead",
    priority: "medium",
    expected_amount: "",
    probability: 50,
    expected_close_date: "",
    description: "",
  });

  // 거래처 목록 로드
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("operation/clients/");
        setClients(res.data?.results ?? res.data ?? []);
      } catch (err) {
        console.error(err);
      }
    })();
  }, []);

  // 편집 모드: 데이터 로드
  useEffect(() => {
    if (!isEdit) return;

    setLoading(true);
    (async () => {
      try {
        const res = await api.get(`operation/opportunities/${id}/`);
        const data = res.data;
        setFormData({
          title: data.title || "",
          client: data.client || "",
          status: data.status || "lead",
          priority: data.priority || "medium",
          expected_amount: data.expected_amount || "",
          probability: data.probability || 50,
          expected_close_date: data.expected_close_date || "",
          description: data.description || "",
        });
      } catch (err) {
        console.error(err);
        alert("데이터를 불러올 수 없습니다.");
        navigate("/sales/opportunities");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isEdit, navigate]);

  // 저장
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      alert("건명을 입력해주세요.");
      return;
    }
    if (!formData.client) {
      alert("거래처를 선택해주세요.");
      return;
    }

    setSaving(true);
    try {
      if (isEdit) {
        await api.patch(`operation/opportunities/${id}/`, formData);
      } else {
        await api.post("operation/opportunities/", formData);
      }
      navigate("/sales/opportunities");
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
        <button onClick={() => navigate("/sales/opportunities")} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">{isEdit ? "영업 기회 수정" : "영업 기회 등록"}</h1>
      </div>

      {/* 폼 */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
        {/* 건명 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">건명 *</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="영업 기회 건명"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            required
          />
        </div>

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

        <div className="grid grid-cols-2 gap-4">
          {/* 상태 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">상태</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="lead">리드</option>
              <option value="contact">접촉</option>
              <option value="proposal">제안</option>
              <option value="negotiation">협상</option>
              <option value="won">수주</option>
              <option value="lost">실패</option>
            </select>
          </div>

          {/* 우선순위 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">우선순위</label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="low">낮음</option>
              <option value="medium">보통</option>
              <option value="high">높음</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* 예상금액 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">예상 금액 (원)</label>
            <input
              type="number"
              value={formData.expected_amount}
              onChange={(e) => setFormData({ ...formData, expected_amount: e.target.value })}
              placeholder="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* 확률 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">성공 확률 (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              value={formData.probability}
              onChange={(e) => setFormData({ ...formData, probability: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        {/* 예상 마감일 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">예상 마감일</label>
          <input
            type="date"
            value={formData.expected_close_date}
            onChange={(e) => setFormData({ ...formData, expected_close_date: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        {/* 설명 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="상세 설명"
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
          />
        </div>

        {/* 버튼 */}
        <div className="flex gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={() => navigate("/sales/opportunities")}
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
