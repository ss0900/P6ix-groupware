// src/pages/operation/TenderForm.jsx
/**
 * 입찰 등록/수정
 */
import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FiArrowLeft, FiSave, FiTrash2 } from "react-icons/fi";
import { SalesService, TenderService } from "../../api/operation";

function TenderForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [leads, setLeads] = useState([]);

  const [formData, setFormData] = useState({
    lead: "",
    title: "",
    description: "",
    notice_url: "",
    deadline: "",
    bond_amount: "",
    status: "open",
    documents_text: "",
  });

  const fetchLeads = useCallback(async () => {
    try {
      const data = await SalesService.getLeads({ status: "active" });
      setLeads(data.results || data);
    } catch (error) {
      console.error("Error fetching leads:", error);
    }
  }, []);

  const fetchTender = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await TenderService.getTender(id);
      setFormData({
        lead: data.lead || "",
        title: data.title || "",
        description: data.description || "",
        notice_url: data.notice_url || "",
        deadline: data.deadline ? data.deadline.slice(0, 16) : "",
        bond_amount: data.bond_amount || "",
        status: data.status || "open",
        documents_text: Array.isArray(data.documents)
          ? data.documents.join("\n")
          : "",
      });
    } catch (error) {
      console.error("Error fetching tender:", error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  useEffect(() => {
    fetchTender();
  }, [fetchTender]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const documents = formData.documents_text
        .split(/[\n,]+/)
        .map((item) => item.trim())
        .filter(Boolean);

      const payload = {
        lead: formData.lead || null,
        title: formData.title,
        description: formData.description,
        notice_url: formData.notice_url,
        deadline: formData.deadline || null,
        bond_amount: formData.bond_amount || null,
        status: formData.status,
        documents,
      };

      if (isEdit) {
        await TenderService.updateTender(id, payload);
      } else {
        await TenderService.createTender(payload);
      }

      navigate("/operation/sales/tenders");
    } catch (error) {
      console.error("Error saving tender:", error);
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("입찰을 삭제하시겠습니까?")) return;
    try {
      await TenderService.deleteTender(id);
      navigate("/operation/sales/tenders");
    } catch (error) {
      console.error("Error deleting tender:", error);
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
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <FiArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-title">{isEdit ? "입찰 수정" : "입찰 등록"}</h1>
      </div>

      <form onSubmit={handleSubmit} className="page-box space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              입찰명 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className="input-base"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              연관 리드 <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.lead}
              onChange={(e) =>
                setFormData({ ...formData, lead: e.target.value })
              }
              className="input-base"
              required
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              상태
            </label>
            <select
              value={formData.status}
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value })
              }
              className="input-base"
            >
              <option value="open">진행중</option>
              <option value="submitted">제출완료</option>
              <option value="won">낙찰</option>
              <option value="lost">탈락</option>
              <option value="closed">마감</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              마감일
            </label>
            <input
              type="datetime-local"
              value={formData.deadline}
              onChange={(e) =>
                setFormData({ ...formData, deadline: e.target.value })
              }
              className="input-base"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              보증금
            </label>
            <input
              type="number"
              value={formData.bond_amount}
              onChange={(e) =>
                setFormData({ ...formData, bond_amount: e.target.value })
              }
              className="input-base"
              placeholder="0"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            공고 URL
          </label>
          <input
            type="url"
            value={formData.notice_url}
            onChange={(e) =>
              setFormData({ ...formData, notice_url: e.target.value })
            }
            className="input-base"
            placeholder="https://"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            설명
          </label>
          <textarea
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            className="input-base"
            rows={3}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            제출 서류 (줄바꿈/쉼표 구분)
          </label>
          <textarea
            value={formData.documents_text}
            onChange={(e) =>
              setFormData({ ...formData, documents_text: e.target.value })
            }
            className="input-base"
            rows={3}
          />
        </div>

        <div className="flex justify-between gap-2 pt-4 border-t border-gray-200">
          {isEdit ? (
            <button
              type="button"
              onClick={handleDelete}
              className="btn-delete flex items-center gap-2"
            >
              <FiTrash2 className="w-4 h-4" />
              삭제
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
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
              {saving ? "저장중..." : "저장"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default TenderForm;
