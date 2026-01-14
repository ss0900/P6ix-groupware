// src/pages/sales/EstimateForm.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { estimateApi, opportunityApi } from "../../api/salesApi";
import { ArrowLeft, Save, Plus, Trash2, Printer, Copy, Check } from "lucide-react";

export default function EstimateForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [opportunities, setOpportunities] = useState([]);
  const [versions, setVersions] = useState([]);

  const [formData, setFormData] = useState({
    opportunity: "",
    title: "",
    valid_until: "",
    notes: "",
  });

  const [items, setItems] = useState([
    { description: "", specification: "", unit: "EA", quantity: 1, unit_price: 0, remark: "" }
  ]);

  const [estimateData, setEstimateData] = useState(null);

  // 영업 기회 목록 로드
  useEffect(() => {
    (async () => {
      try {
        const res = await opportunityApi.getList();
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
        const [detailRes, versionsRes] = await Promise.all([
          estimateApi.getDetail(id),
          estimateApi.getVersions(id),
        ]);
        const data = detailRes.data;
        setEstimateData(data);
        setFormData({
          opportunity: data.opportunity || "",
          title: data.title || "",
          valid_until: data.valid_until || "",
          notes: data.notes || "",
        });
        if (data.items?.length > 0) {
          setItems(data.items.map(item => ({
            id: item.id,
            description: item.description || "",
            specification: item.specification || "",
            unit: item.unit || "EA",
            quantity: item.quantity || 1,
            unit_price: item.unit_price || 0,
            remark: item.remark || "",
          })));
        }
        setVersions(versionsRes.data || []);
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
    setItems([...items, { description: "", specification: "", unit: "EA", quantity: 1, unit_price: 0, remark: "" }]);
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
        await estimateApi.update(id, formData);
      } else {
        const res = await estimateApi.create(formData);
        estimateId = res.data.id;
      }

      // 항목 추가
      for (const item of items) {
        if (item.description && !item.id) {
          await estimateApi.addItem(estimateId, item);
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

  // 새 버전 생성
  const handleCreateVersion = async () => {
    if (!window.confirm("새 버전을 생성하시겠습니까?")) return;
    
    try {
      const res = await estimateApi.createVersion(id);
      navigate(`/sales/estimates/${res.data.id}`);
    } catch (err) {
      console.error(err);
      alert("버전 생성에 실패했습니다.");
    }
  };

  // 최종 승인본 설정
  const handleSetFinal = async () => {
    if (!window.confirm("이 견적서를 최종 승인본으로 설정하시겠습니까?")) return;
    
    try {
      await estimateApi.setFinal(id);
      setEstimateData({ ...estimateData, is_final: true });
      alert("최종 승인본으로 설정되었습니다.");
    } catch (err) {
      console.error(err);
      alert("설정에 실패했습니다.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/sales/estimates")} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEdit ? "견적 수정" : "견적 작성"}
            </h1>
            {estimateData && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-gray-500">
                  {estimateData.estimate_number}
                </span>
                <span className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-600">
                  v{estimateData.version}
                </span>
                {estimateData.is_final && (
                  <span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-600 flex items-center gap-1">
                    <Check size={12} />
                    최종
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 버전 관련 버튼 */}
        {isEdit && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(`/sales/estimates/${id}/print`)}
              className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Printer size={16} />
              인쇄
            </button>
            <button
              onClick={handleCreateVersion}
              className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Copy size={16} />
              새 버전
            </button>
            {!estimateData?.is_final && (
              <button
                onClick={handleSetFinal}
                className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Check size={16} />
                최종 승인
              </button>
            )}
          </div>
        )}
      </div>

      {/* 버전 히스토리 */}
      {versions.length > 1 && (
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-sm font-medium text-gray-600 mb-2">버전 히스토리</p>
          <div className="flex items-center gap-2 flex-wrap">
            {versions.map((v) => (
              <button
                key={v.id}
                onClick={() => navigate(`/sales/estimates/${v.id}`)}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                  v.id === parseInt(id)
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white border-gray-300 hover:bg-gray-50"
                }`}
              >
                v{v.version}
                {v.is_final && " (최종)"}
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 기본 정보 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">영업 기회 *</label>
              <select
                value={formData.opportunity}
                onChange={(e) => setFormData({ ...formData, opportunity: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                required
                disabled={isEdit}
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
              <div key={index} className="grid grid-cols-12 gap-2 items-center">
                <input
                  type="text"
                  value={item.description}
                  onChange={(e) => updateItem(index, "description", e.target.value)}
                  placeholder="품목명"
                  className="col-span-3 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <input
                  type="text"
                  value={item.specification}
                  onChange={(e) => updateItem(index, "specification", e.target.value)}
                  placeholder="규격"
                  className="col-span-2 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <input
                  type="text"
                  value={item.unit}
                  onChange={(e) => updateItem(index, "unit", e.target.value)}
                  placeholder="단위"
                  className="col-span-1 px-3 py-2 border border-gray-300 rounded-lg text-sm text-center"
                />
                <input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => updateItem(index, "quantity", parseInt(e.target.value) || 1)}
                  placeholder="수량"
                  className="col-span-1 px-3 py-2 border border-gray-300 rounded-lg text-sm text-right"
                />
                <input
                  type="number"
                  value={item.unit_price}
                  onChange={(e) => updateItem(index, "unit_price", parseInt(e.target.value) || 0)}
                  placeholder="단가"
                  className="col-span-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-right"
                />
                <div className="col-span-2 text-right font-medium text-sm">
                  ₩{(item.quantity * item.unit_price).toLocaleString()}
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="col-span-1 p-2 text-red-500 hover:bg-red-50 rounded-lg"
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
