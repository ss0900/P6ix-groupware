// src/pages/operation/CustomerForm.jsx
/**
 * 고객사 수정 폼
 */
import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FiArrowLeft, FiSave } from "react-icons/fi";
import { CustomerService } from "../../api/operation";

function CustomerForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    business_number: "",
    industry: "",
    phone: "",
    address: "",
  });

  const fetchCompany = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await CustomerService.getCompany(id);
      setFormData({
        name: data.name || "",
        business_number: data.business_number || "",
        industry: data.industry || "",
        phone: data.phone || "",
        address: data.address || "",
      });
    } catch (error) {
      console.error("Error fetching company:", error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCompany();
  }, [fetchCompany]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        name: formData.name,
        business_number: formData.business_number || "",
        industry: formData.industry || "",
        phone: formData.phone || "",
        address: formData.address || "",
      };

      if (isEdit) {
        await CustomerService.updateCompany(id, payload);
        navigate(`/operation/sales/customers/${id}`);
      } else {
        const created = await CustomerService.createCompany(payload);
        const createdId = created?.id;
        if (createdId) {
          navigate(`/operation/sales/customers/${createdId}`);
        } else {
          navigate("/operation/sales/customers");
        }
      }
    } catch (error) {
      console.error("Error saving company:", error);
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <FiArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-title">
          {isEdit ? "고객사 수정" : "고객사 등록"}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="page-box space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-4">
            기본 정보
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                회사명 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="input-base"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                사업자번호
              </label>
              <input
                type="text"
                value={formData.business_number}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    business_number: e.target.value,
                  })
                }
                className="input-base"
                placeholder="000-00-00000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                업종
              </label>
              <input
                type="text"
                value={formData.industry}
                onChange={(e) =>
                  setFormData({ ...formData, industry: e.target.value })
                }
                className="input-base"
              />
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-4">
            연락처
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                대표전화
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                className="input-base"
                placeholder="02-000-0000"
              />
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-4">주소</h3>
          <textarea
            value={formData.address}
            onChange={(e) =>
              setFormData({ ...formData, address: e.target.value })
            }
            className="input-base"
            rows={3}
          />
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn-cancel"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={saving}
            className="btn-save flex items-center gap-2"
          >
            <FiSave className="w-4 h-4" />
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default CustomerForm;
