// src/pages/operation/QuoteTemplateList.jsx
/**
 * 견적 템플릿 관리
 */
import React, { useState, useEffect } from "react";
import { FiPlus, FiLayers, FiEdit2, FiTrash2 } from "react-icons/fi";
import { QuoteService } from "../../api/operation";
import Modal from "../../components/common/ui/Modal";

function QuoteTemplateList() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    header_text: "",
    footer_text: "",
    terms: "",
    is_default: false,
  });
  const [saving, setSaving] = useState(false);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const data = await QuoteService.getTemplates();
      setTemplates(data);
    } catch (error) {
      console.error("Error fetching templates:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleAdd = () => {
    setEditingTemplate(null);
    setFormData({ name: "", header_text: "", footer_text: "", terms: "", is_default: false });
    setShowModal(true);
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      header_text: template.header_text,
      footer_text: template.footer_text,
      terms: template.terms,
      is_default: template.is_default,
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("정말 삭제하시겠습니까?")) return;
    try {
      await QuoteService.deleteTemplate(id);
      fetchTemplates();
    } catch (error) {
      console.error("Error deleting template:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      if (editingTemplate) {
        await QuoteService.updateTemplate(editingTemplate.id, formData);
      } else {
        await QuoteService.createTemplate(formData);
      }
      setShowModal(false);
      fetchTemplates();
    } catch (error) {
      console.error("Error saving template:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FiLayers className="w-6 h-6 text-blue-600" />
          <h1 className="text-title">견적 템플릿</h1>
        </div>
        <button onClick={handleAdd} className="btn-create flex items-center gap-2">
          <FiPlus className="w-4 h-4" />
          템플릿 추가
        </button>
      </div>

      {/* List */}
      <div className="page-box">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-12">
            <FiLayers className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">등록된 템플릿이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {templates.map((template) => (
              <div
                key={template.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900">{template.name}</h3>
                    {template.is_default && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">기본</span>
                    )}
                  </div>
                  {template.terms && (
                    <p className="text-sm text-gray-500 mt-1 line-clamp-1">{template.terms}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEdit(template)}
                    className="p-2 text-gray-500 hover:bg-gray-100 rounded"
                  >
                    <FiEdit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(template.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded"
                  >
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 템플릿 추가/수정 모달 */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingTemplate ? "템플릿 수정" : "템플릿 추가"}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              템플릿명 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input-base"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">머리말</label>
            <textarea
              value={formData.header_text}
              onChange={(e) => setFormData({ ...formData, header_text: e.target.value })}
              className="input-base"
              rows={3}
              placeholder="견적서 상단에 표시될 인사말"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">꼬리말</label>
            <textarea
              value={formData.footer_text}
              onChange={(e) => setFormData({ ...formData, footer_text: e.target.value })}
              className="input-base"
              rows={3}
              placeholder="견적서 하단에 표시될 마무리말"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">거래조건</label>
            <textarea
              value={formData.terms}
              onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
              className="input-base"
              rows={4}
              placeholder="결제조건, 납기, 유효기간 등"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_default"
              checked={formData.is_default}
              onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
              className="w-4 h-4 rounded border-gray-300"
            />
            <label htmlFor="is_default" className="text-sm text-gray-700">기본 템플릿으로 설정</label>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={() => setShowModal(false)} className="btn-cancel">
              취소
            </button>
            <button type="submit" disabled={saving} className="btn-save">
              {saving ? "저장 중..." : "저장"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default QuoteTemplateList;
