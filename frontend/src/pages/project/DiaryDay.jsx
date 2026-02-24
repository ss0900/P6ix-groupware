// src/pages/project/DiaryDay.jsx
// 업무일지 일일
import React, { useState, useEffect, useCallback } from "react";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Save,
  RefreshCw,
  Plus,
  Trash2,
  Calendar,
} from "lucide-react";
import ProjectService from "../../api/project";

const formatDate = (date) => {
  return date.toISOString().split("T")[0];
};

const formatDateTitle = (date) => {
  const days = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 ${days[date.getDay()]}`;
};

export default function DiaryDay() {
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [projects, setProjects] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // 프로젝트 목록 로드
  const loadProjects = useCallback(async () => {
    try {
      const data = await ProjectService.getProjects({ ordering: "name" });
      setProjects(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      console.error("Failed to load projects", err);
    }
  }, []);

  // 선택된 날짜의 업무일지 로드
  const loadEntries = useCallback(async () => {
    if (!selectedDate) return;
    
    setLoading(true);
    try {
      const data = await ProjectService.getDiaries({ date: selectedDate });
      const entryList = Array.isArray(data) ? data : data.results || [];
      
      if (entryList.length === 0) {
        setEntries([createEmptyEntry()]);
      } else {
        setEntries(entryList.map((e) => ({
          id: e.id,
          project: e.project || "",
          task: e.task || "",
          content: e.content || "",
        })));
      }
    } catch (err) {
      console.error("Failed to load entries", err);
      setEntries([createEmptyEntry()]);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const createEmptyEntry = () => ({
    id: null,
    project: "",
    task: "",
    content: "",
  });

  const handleAddEntry = () => {
    setEntries((prev) => [...prev, createEmptyEntry()]);
  };

  const handleRemoveEntry = (index) => {
    setEntries((prev) => prev.filter((_, i) => i !== index));
  };

  const handleEntryChange = (index, field, value) => {
    setEntries((prev) =>
      prev.map((entry, i) =>
        i === index ? { ...entry, [field]: value } : entry
      )
    );
  };

  const handlePrevDay = () => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() - 1);
    setSelectedDate(formatDate(date));
  };

  const handleNextDay = () => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + 1);
    setSelectedDate(formatDate(date));
  };

  const handleToday = () => {
    setSelectedDate(formatDate(new Date()));
  };

  const handleSave = async () => {
    if (!selectedDate) return;
    
    setSaving(true);
    try {
      await ProjectService.saveDayDiaries(
        selectedDate,
        entries.filter((e) => e.content.trim())
      );
      alert("저장되었습니다.");
    } catch (err) {
      console.error("Failed to save", err);
      alert("저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const displayDate = new Date(selectedDate);

  return (
    <div className="p-6 max-w-4xl">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <BookOpen className="text-blue-500" size={24} />
          <h1 className="text-xl font-bold text-gray-900">업무일지 쓰기 [일일]</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadEntries}
            className="p-2 hover:bg-gray-100 rounded text-gray-600"
            disabled={loading}
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-create flex items-center gap-1"
          >
            <Save size={16} />
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>

      {/* 날짜 선택 */}
      <div className="bg-white border rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevDay}
              className="p-2 hover:bg-gray-100 rounded"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={handleToday}
              className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
            >
              오늘
            </button>
            <button
              onClick={handleNextDay}
              className="p-2 hover:bg-gray-100 rounded"
            >
              <ChevronRight size={20} />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <Calendar size={18} className="text-gray-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border rounded px-3 py-1.5 text-sm"
            />
          </div>
          <span className="text-lg font-medium text-gray-700">
            {formatDateTitle(displayDate)}
          </span>
        </div>
      </div>

      {/* 업무일지 입력 */}
      <div className="bg-white border rounded-lg">
        <div className="p-4 border-b bg-gray-50">
          <h2 className="font-medium text-gray-700">업무 내용</h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent" />
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {entries.map((entry, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-600 w-16">
                      #{index + 1}
                    </span>
                    <select
                      value={entry.project}
                      onChange={(e) =>
                        handleEntryChange(index, "project", e.target.value)
                      }
                      className="border rounded px-3 py-1.5 text-sm min-w-[200px]"
                    >
                      <option value="">프로젝트 선택 (선택사항)</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {entries.length > 1 && (
                    <button
                      onClick={() => handleRemoveEntry(index)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
                <textarea
                  value={entry.content}
                  onChange={(e) =>
                    handleEntryChange(index, "content", e.target.value)
                  }
                  placeholder="오늘 수행한 업무 내용을 입력하세요..."
                  rows={5}
                  className="w-full border rounded px-3 py-2 text-sm"
                />
              </div>
            ))}

            {/* 항목 추가 버튼 */}
            <button
              onClick={handleAddEntry}
              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
            >
              <Plus size={16} />
              항목 추가
            </button>
          </div>
        )}
      </div>

      {/* 안내 */}
      <div className="mt-4 text-sm text-gray-500">
        <p>• 프로젝트 선택은 선택사항입니다</p>
        <p>• 여러 업무를 기록하려면 '항목 추가'를 클릭하세요</p>
        <p>• 저장 버튼을 클릭하여 업무일지를 저장하세요</p>
      </div>
    </div>
  );
}
