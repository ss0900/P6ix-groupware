// src/pages/sales/EstimateForm.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/axios";
import { ArrowLeft, Save, Plus, Trash2 } from "lucide-react";

export default function EstimateForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [opportunities, setOpportunities] = useState([]);

  const [formData, setFormData] = useState({
    opportunity: "",
    title: "",
    valid_until: "",
    notes: "",
  });

  const [items, setItems] = useState([
    { description: "", quantity: 1, unit_price: 0 }
  ]);

  // 영업 기회 목록 로드
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("operation/opportunities/");
        setOpportunities(res.data?.results ?? res.data ?? []);
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
        const res = await api.get(`operation/estimates/${id}/`);
        const data = res.data;
        setFormData({
          opportunity: data.opportunity || "",
          title: data.title || "",
          valid_until: data.valid_until || "",
          notes: data.notes || "",
        });
        if (data.items?.length > 0) {
          setItems(data.items);
        }
      } catch (err) {
        console.error(err);
        alert("데이터를 불러올 수 없습니다.");
        navigate("/sales/estimates");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isEdit, navigate]);

  // 항목 추가
  const addItem = () => {
    setItems([...items, { description: "", quantity: 1, unit_price: 0 }]);
  };

  // 항목 삭제
  const removeItem = (index) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  // 항목 수정
  const updateItem = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  // 합계 계산
  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  const tax = Math.floor(subtotal * 0.1);
  const total = subtotal + tax;

  // 저장
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.opportunity) {
      alert("영업 기회를 선택해주세요.");
      return;
    }
    if (!formData.title.trim()) {
      alert("제목을 입력해주세요.");
      return;
    }

    setSaving(true);
    try {
      let estimateId = id;
      
      if (isEdit) {
        await api.patch(`operation/estimates/${id}/`, formData);
      } else {
        const res = await api.post("operation/estimates/", formData);
        estimateId = res.data.id;
      }

      // 항목 추가 (간단히 처리 - 실제로는 별도 API 필요)
      for (const item of items) {
        if (item.description) {
          await api.post(`operation/estimates/${estimateId}/add_item/`, item);
        }
      }

      navigate("/sales/estimates");
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
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate("/sales/estimates")} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">{isEdit ? "견적 수정" : "견적 작성"}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 기본 정보 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">영업 기회 *</label>
              <select
                value={formData.opportunity}
                onChange={(e) => setFormData({ ...formData, opportunity: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                required
              >
                <option value="">선택해주세요</option>
                {opportunities.map((o) => (
                  <option key={o.id} value={o.id}>{o.title} ({o.client_name})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">유효기간</label>
              <input
                type="date"
                value={formData.valid_until}
                onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">제목 *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="견적 제목"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              required
            />
          </div>
        </div>

        {/* 항목 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">견적 항목</h2>
            <button
              type="button"
              onClick={addItem}
              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
            >
              <Plus size={16} />
              항목 추가
            </button>
          </div>

          <div className="space-y-3">
            {items.map((item, index) => (
              <div key={index} className="flex items-center gap-3">
                <input
                  type="text"
                  value={item.description}
                  onChange={(e) => updateItem(index, "description", e.target.value)}
                  placeholder="품목명"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => updateItem(index, "quantity", parseInt(e.target.value) || 1)}
                  placeholder="수량"
                  className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-right"
                />
                <input
                  type="number"
                  value={item.unit_price}
                  onChange={(e) => updateItem(index, "unit_price", parseInt(e.target.value) || 0)}
                  placeholder="단가"
                  className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-right"
                />
                <div className="w-32 text-right font-medium">
                  ₩{(item.quantity * item.unit_price).toLocaleString()}
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                  disabled={items.length === 1}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          {/* 합계 */}
          <div className="mt-6 pt-4 border-t border-gray-200 space-y-2">
            <div className="flex justify-end text-sm">
              <span className="w-24 text-gray-600">공급가액:</span>
              <span className="w-32 text-right font-medium">₩{subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-end text-sm">
              <span className="w-24 text-gray-600">세액 (10%):</span>
              <span className="w-32 text-right font-medium">₩{tax.toLocaleString()}</span>
            </div>
            <div className="flex justify-end text-lg font-bold">
              <span className="w-24">합계:</span>
              <span className="w-32 text-right text-blue-600">₩{total.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* 비고 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">비고</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
          />
        </div>

        {/* 버튼 */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate("/sales/estimates")}
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
