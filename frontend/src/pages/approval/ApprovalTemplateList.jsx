// src/pages/approval/ApprovalTemplateList.jsx
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import HtmlEditorFrame from "../../components/HtmlEditorFrame";
import {
  FileText,
  Search,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  X,
} from "lucide-react";

const categories = [
  { value: "", label: "전체" },
  { value: "general", label: "일반" },
  { value: "leave", label: "휴가" },
  { value: "expense", label: "지출" },
  { value: "official", label: "공문" },
  { value: "report", label: "보고" },
  { value: "etc", label: "기타" },
];

const getCategoryLabel = (value) => {
  const target = categories.find((category) => category.value === value);
  return target?.label || value || "기타";
};

const TemplateModal = ({
  isOpen,
  editingTemplate,
  formData,
  setFormData,
  saving,
  onClose,
  onSubmit,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {editingTemplate ? "양식 수정" : "양식 추가"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              양식명 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, name: event.target.value }))
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500"
              placeholder="양식명을 입력하세요"
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                분류
              </label>
              <select
                value={formData.category}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    category: event.target.value,
                  }))
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500"
              >
                {categories
                  .filter((category) => category.value !== "")
                  .map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                상태
              </label>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 px-3 py-2">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      is_active: event.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded text-sky-500 focus:ring-sky-500"
                />
                <span className="text-sm text-gray-700">활성화</span>
              </label>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              내용
            </label>
            <HtmlEditorFrame
              value={formData.content}
              onChange={(nextContent) =>
                setFormData((prev) => ({
                  ...prev,
                  content: nextContent,
                }))
              }
              height={320}
              title="양식 내용 편집기"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-sky-500 px-4 py-2 text-sm text-white hover:bg-sky-600 disabled:bg-gray-400"
            >
              {saving ? "저장 중..." : "저장"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default function ApprovalTemplateList() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    content: "",
    category: "general",
    is_active: true,
  });

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedCategory) params.category = selectedCategory;
      const res = await api.get("/approval/templates/", { params });
      setTemplates(res.data?.results ?? res.data ?? []);
    } catch (err) {
      console.error("Failed to load templates:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const filteredTemplates = useMemo(() => {
    if (!searchQuery.trim()) return templates;
    const query = searchQuery.toLowerCase();
    return templates.filter(
      (template) =>
        template.name?.toLowerCase().includes(query) ||
        template.content?.toLowerCase().includes(query),
    );
  }, [templates, searchQuery]);

  const openCreateModal = () => {
    setEditingTemplate(null);
    setFormData({
      name: "",
      content: "",
      category: selectedCategory || "general",
      is_active: true,
    });
    setModalOpen(true);
  };

  const openEditModal = (template) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name || "",
      content: template.content || "",
      category: template.category || "general",
      is_active: Boolean(template.is_active),
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingTemplate(null);
  };

  const handleSubmitTemplate = async (event) => {
    event.preventDefault();

    if (!formData.name.trim()) {
      alert("양식명을 입력해주세요.");
      return;
    }

    const payload = {
      name: formData.name.trim(),
      content: formData.content,
      category: formData.category,
      is_active: formData.is_active,
    };

    try {
      setSavingTemplate(true);
      if (editingTemplate) {
        await api.patch(`/approval/templates/${editingTemplate.id}/`, payload);
      } else {
        await api.post("/approval/templates/", payload);
      }
      closeModal();
      await loadTemplates();
    } catch (error) {
      console.error("Failed to save template:", error);
      alert("양식 저장 중 오류가 발생했습니다.");
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleDeleteTemplate = async (template) => {
    if (!window.confirm(`"${template.name}" 양식을 삭제하시겠습니까?`)) {
      return;
    }

    try {
      await api.delete(`/approval/templates/${template.id}/`);
      await loadTemplates();
    } catch (error) {
      console.error("Failed to delete template:", error);
      alert("양식 삭제 중 오류가 발생했습니다.");
    }
  };

  const handleSelect = (template) => {
    navigate(`/approval/new?template=${template.id}`);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr)
      .toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
      .replace(/\. /g, "-")
      .replace(".", "");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">공문 양식</h1>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600"
        >
          <Plus size={16} />
          양식 추가
        </button>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            {categories.map((category) => (
              <button
                key={category.value}
                type="button"
                onClick={() => setSelectedCategory(category.value)}
                className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                  selectedCategory === category.value
                    ? "bg-sky-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>

          <div className="relative ml-auto w-full max-w-xs">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="양식명 검색..."
              className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500"
            />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center border-b border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-600">
          <div className="flex-1">양식명</div>
          <div className="w-24 text-center">상태</div>
          <div className="w-32 text-center">생성일</div>
          <div className="w-28 text-center">관리</div>
          <div className="w-10" />
        </div>

        <div className="divide-y divide-gray-100">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              <FileText size={48} className="mx-auto mb-4 text-gray-300" />
              <p>등록된 양식이 없습니다.</p>
            </div>
          ) : (
            filteredTemplates.map((template) => (
              <div
                key={template.id}
                className="flex cursor-pointer items-center px-4 py-4 transition-colors hover:bg-gray-50"
                onClick={() => handleSelect(template)}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <FileText size={18} className="text-sky-500" />
                    <span className="font-medium text-gray-900">
                      {template.name}
                    </span>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                      {template.category_display ||
                        getCategoryLabel(template.category)}
                    </span>
                  </div>
                  {template.content && (
                    <p className="ml-6 mt-1 truncate text-sm text-gray-500">
                      {template.content}
                    </p>
                  )}
                </div>

                <div className="w-24 text-center">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      template.is_active
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {template.is_active ? "활성" : "비활성"}
                  </span>
                </div>

                <div className="w-32 text-center text-sm text-gray-500">
                  {formatDate(template.created_at)}
                </div>

                <div className="w-28">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        openEditModal(template);
                      }}
                      className="rounded p-1.5 text-gray-600 hover:bg-gray-200"
                      title="수정"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleDeleteTemplate(template);
                      }}
                      className="rounded p-1.5 text-red-600 hover:bg-red-100"
                      title="삭제"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="w-10 text-center">
                  <ChevronRight size={18} className="text-gray-400" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <TemplateModal
        isOpen={modalOpen}
        editingTemplate={editingTemplate}
        formData={formData}
        setFormData={setFormData}
        saving={savingTemplate}
        onClose={closeModal}
        onSubmit={handleSubmitTemplate}
      />
    </div>
  );
}
