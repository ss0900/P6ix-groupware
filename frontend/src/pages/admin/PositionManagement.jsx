// src/pages/admin/PositionManagement.jsx
import React, { useEffect, useState, useCallback } from "react";
import api from "../../api/axios";
import { Plus, Edit, Trash2, X, GripVertical } from "lucide-react";

// 직위 편집 모달
const PositionModal = ({ isOpen, onClose, position, companies, onSave }) => {
  const [formData, setFormData] = useState({
    name: "",
    level: "",
    company: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (position) {
      setFormData({
        name: position.name || "",
        level: position.level || "",
        company: position.company_id || position.company || "",
      });
    } else {
      setFormData({ name: "", level: "", company: "" });
    }
  }, [position]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(formData, position?.id);
      onClose();
    } catch (err) {
      console.error(err);
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">
            {position ? "직위 수정" : "직위 추가"}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              회사 <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.company}
              onChange={(e) =>
                setFormData({ ...formData, company: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              required
            >
              <option value="">선택</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              직위명 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="예: 대표이사, 부장, 과장"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              레벨 (순서)
            </label>
            <input
              type="number"
              value={formData.level}
              onChange={(e) =>
                setFormData({ ...formData, level: e.target.value })
              }
              placeholder="숫자가 낮을수록 높은 직급"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              숫자가 낮을수록 높은 직급입니다 (예: 대표=1, 부장=2, 과장=3)
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? "저장 중..." : "저장"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default function PositionManagement() {
  const [companies, setCompanies] = useState([]);
  const [positions, setPositions] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [loading, setLoading] = useState(true);

  // 모달 상태
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState(null);

  // 데이터 로드
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [compRes, posRes] = await Promise.all([
        api.get("core/companies/"),
        api.get("core/positions/"),
      ]);

      const comps = compRes.data?.results ?? compRes.data ?? [];
      const poss = posRes.data?.results ?? posRes.data ?? [];

      setCompanies(comps);
      setPositions(poss);

      // 첫 번째 회사 자동 선택
      if (comps.length > 0 && !selectedCompany) {
        setSelectedCompany(String(comps[0].id));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedCompany]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 필터링된 직위 목록
  const filteredPositions = positions
    .filter(
      (p) =>
        !selectedCompany ||
        String(p.company_id || p.company) === selectedCompany
    )
    .sort((a, b) => (a.level || 999) - (b.level || 999));

  // 저장 핸들러
  const handleSavePosition = async (data, positionId) => {
    if (positionId) {
      await api.patch(`core/positions/${positionId}/`, data);
    } else {
      await api.post("core/positions/", data);
    }
    loadData();
  };

  // 삭제 핸들러
  const handleDelete = async (position) => {
    if (!window.confirm(`"${position.name}" 직위를 삭제하시겠습니까?`)) return;
    try {
      await api.delete(`core/positions/${position.id}/`);
      loadData();
    } catch (err) {
      console.error(err);
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">직위 관리</h1>
        <button
          onClick={() => {
            setEditingPosition(null);
            setModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={18} />
          직위 추가
        </button>
      </div>

      {/* 회사 필터 */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium text-gray-700">회사 선택:</label>
        <select
          value={selectedCompany}
          onChange={(e) => setSelectedCompany(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        >
          <option value="">전체</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* 직위 목록 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
          </div>
        ) : filteredPositions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            등록된 직위가 없습니다.
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  순서
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  직위명
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  회사
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  레벨
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                  관리
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredPositions.map((position, index) => (
                <tr
                  key={position.id}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="px-4 py-3 text-sm text-gray-500">
                    <div className="flex items-center gap-2">
                      <GripVertical size={16} className="text-gray-400" />
                      {index + 1}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {position.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {position.company_name || "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {position.level || "-"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setEditingPosition(position);
                          setModalOpen(true);
                        }}
                        className="p-1.5 hover:bg-gray-200 rounded text-gray-600"
                        title="수정"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(position)}
                        className="p-1.5 hover:bg-red-100 rounded text-red-600"
                        title="삭제"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 모달 */}
      <PositionModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingPosition(null);
        }}
        position={editingPosition}
        companies={companies}
        onSave={handleSavePosition}
      />
    </div>
  );
}
