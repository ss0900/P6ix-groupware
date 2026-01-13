// src/pages/approval/ApprovalTemplateList.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import {
  FileText,
  Search,
  ChevronRight,
} from "lucide-react";

export default function ApprovalTemplateList() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  // 카테고리 목록
  const categories = [
    { value: "", label: "전체" },
    { value: "general", label: "일반" },
    { value: "leave", label: "휴가" },
    { value: "expense", label: "지출" },
    { value: "official", label: "공문" },
    { value: "report", label: "보고" },
    { value: "etc", label: "기타" },
  ];

  // 템플릿 목록 로드
  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedCategory) params.category = selectedCategory;
      const res = await api.get("/approval/templates/", { params });
      let data = res.data?.results ?? res.data ?? [];
      
      // 검색 필터링
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        data = data.filter(
          (t) =>
            t.name.toLowerCase().includes(query) ||
            t.description?.toLowerCase().includes(query)
        );
      }
      
      setTemplates(data);
    } catch (err) {
      console.error("Failed to load templates:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, searchQuery]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  // 양식 선택 시 해당 양식으로 문서 작성 페이지로 이동
  const handleSelect = (template) => {
    navigate(`/approval/new?template=${template.id}`);
  };

  // 날짜 포맷
  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).replace(/\. /g, "-").replace(".", "");
  };

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">공문 양식</h1>
      </div>

      {/* 검색 및 필터 바 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-4 flex-wrap">
          {/* 카테고리 필터 */}
          <div className="flex items-center gap-2">
            {categories.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  selectedCategory === cat.value
                    ? "bg-sky-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* 검색 */}
          <div className="relative flex-1 max-w-xs ml-auto">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="양식명 검색..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
            />
          </div>
        </div>
      </div>

      {/* 양식 목록 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* 테이블 헤더 */}
        <div className="flex items-center px-4 py-3 bg-gray-50 border-b border-gray-200 text-sm text-gray-600 font-medium">
          <div className="flex-1">양식명</div>
          <div className="w-32 text-center">작성일</div>
          <div className="w-10"></div>
        </div>

        {/* 양식 목록 */}
        <div className="divide-y divide-gray-100">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-sky-500 border-t-transparent"></div>
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText size={48} className="mx-auto mb-4 text-gray-300" />
              <p>등록된 양식이 없습니다.</p>
            </div>
          ) : (
            templates.map((template) => (
              <div
                key={template.id}
                className="flex items-center px-4 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => handleSelect(template)}
              >
                {/* 양식명 */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <FileText size={18} className="text-sky-500" />
                    <span className="font-medium text-gray-900">{template.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                      {template.category_display}
                    </span>
                  </div>
                  {template.description && (
                    <p className="text-sm text-gray-500 mt-1 ml-6 truncate">
                      {template.description}
                    </p>
                  )}
                </div>

                {/* 작성일 */}
                <div className="w-32 text-center text-sm text-gray-500">
                  {formatDate(template.created_at)}
                </div>

                {/* 화살표 */}
                <div className="w-10 text-center">
                  <ChevronRight size={18} className="text-gray-400" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
