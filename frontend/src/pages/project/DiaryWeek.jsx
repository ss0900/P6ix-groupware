// src/pages/project/DiaryWeek.jsx
// 업무일지 주간
import React, { useState, useEffect, useCallback } from "react";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Save,
  RefreshCw,
  Plus,
  Trash2,
} from "lucide-react";
import ProjectService from "../../api/project";

// 날짜 유틸
const getWeekDates = (baseDate) => {
  const date = new Date(baseDate);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // 월요일 기준
  const monday = new Date(date.setDate(diff));
  
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d);
  }
  return dates;
};

const formatDate = (date) => {
  return date.toISOString().split("T")[0];
};

const formatDateTitle = (date) => {
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return `${date.getMonth() + 1}월 ${date.getDate()}일 (${days[date.getDay()]})`;
};

const formatWeekRange = (dates) => {
  if (dates.length === 0) return "";
  const start = dates[0];
  const end = dates[dates.length - 1];
  return `${start.getFullYear()}년 ${start.getMonth() + 1}월 ${start.getDate()}일 ~ ${end.getMonth() + 1}월 ${end.getDate()}일`;
};

export default function DiaryWeek() {
  const [baseDate, setBaseDate] = useState(new Date());
  const [weekDates, setWeekDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [projects, setProjects] = useState([]);
  const [entries, setEntries] = useState([]); // 선택된 날짜의 업무일지
  const [allEntries, setAllEntries] = useState({}); // 날짜별 업무일지 개수
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // 주간 날짜 계산
  useEffect(() => {
    const dates = getWeekDates(baseDate);
    setWeekDates(dates);
    
    // 오늘 날짜가 주에 포함되어 있으면 오늘 선택, 아니면 월요일
    const today = formatDate(new Date());
    const todayInWeek = dates.find((d) => formatDate(d) === today);
    setSelectedDate(todayInWeek ? formatDate(todayInWeek) : formatDate(dates[0]));
  }, [baseDate]);

  // 프로젝트 목록 로드
  const loadProjects = useCallback(async () => {
    try {
      const data = await ProjectService.getProjects({ ordering: "name" });
      setProjects(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      console.error("Failed to load projects", err);
    }
  }, []);

  // 주간 업무일지 개수 로드
  const loadWeekSummary = useCallback(async () => {
    if (weekDates.length === 0) return;
    
    try {
      const startDate = formatDate(weekDates[0]);
      const endDate = formatDate(weekDates[6]);
      
      const data = await ProjectService.getDiaries({
        start_date: startDate,
        end_date: endDate,
      });
      
      const entryList = Array.isArray(data) ? data : data.results || [];
      
      // 날짜별 개수 집계
      const countByDate = {};
      entryList.forEach((e) => {
        countByDate[e.date] = (countByDate[e.date] || 0) + 1;
      });
      setAllEntries(countByDate);
    } catch (err) {
      console.error("Failed to load week summary", err);
    }
  }, [weekDates]);

  // 선택된 날짜의 업무일지 로드
  const loadDayEntries = useCallback(async () => {
    if (!selectedDate) return;
    
    setLoading(true);
    try {
      const data = await ProjectService.getDiaries({ date: selectedDate });
      const entryList = Array.isArray(data) ? data : data.results || [];
      
      if (entryList.length === 0) {
        // 빈 항목 하나 추가
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
    loadWeekSummary();
  }, [loadWeekSummary]);

  useEffect(() => {
    loadDayEntries();
  }, [loadDayEntries]);

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

  const handlePrevWeek = () => {
    setBaseDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 7);
      return d;
    });
  };

  const handleNextWeek = () => {
    setBaseDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 7);
      return d;
    });
  };

  const handleThisWeek = () => {
    setBaseDate(new Date());
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
      loadWeekSummary(); // 주간 요약 새로고침
    } catch (err) {
      console.error("Failed to save", err);
      alert("저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const today = formatDate(new Date());

  return (
    <div className="p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <BookOpen className="text-blue-500" size={24} />
          <h1 className="text-xl font-bold text-gray-900">업무일지 쓰기 [주간]</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadDayEntries}
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

      {/* 주간 네비게이션 */}
      <div className="bg-white border rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevWeek}
              className="p-2 hover:bg-gray-100 rounded"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={handleThisWeek}
              className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
            >
              이번 주
            </button>
            <button
              onClick={handleNextWeek}
              className="p-2 hover:bg-gray-100 rounded"
            >
              <ChevronRight size={20} />
            </button>
          </div>
          <span className="text-lg font-medium text-gray-700">
            {formatWeekRange(weekDates)}
          </span>
        </div>

        {/* 주간 날짜 탭 */}
        <div className="flex gap-2">
          {weekDates.map((date) => {
            const dateStr = formatDate(date);
            const isSelected = dateStr === selectedDate;
            const isToday = dateStr === today;
            const count = allEntries[dateStr] || 0;
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            
            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDate(dateStr)}
                className={`flex-1 p-3 rounded-lg text-center transition ${
                  isSelected
                    ? "bg-blue-500 text-white"
                    : isToday
                    ? "bg-blue-100 text-blue-700 border-2 border-blue-300"
                    : isWeekend
                    ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                }`}
              >
                <div className="text-xs font-medium">
                  {formatDateTitle(date)}
                </div>
                {count > 0 && (
                  <div
                    className={`text-xs mt-1 ${
                      isSelected ? "text-blue-100" : "text-gray-500"
                    }`}
                  >
                    {count}건 작성
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 선택된 날짜의 업무일지 */}
      <div className="bg-white border rounded-lg">
        <div className="p-4 border-b bg-gray-50">
          <h2 className="font-medium text-gray-700">
            {selectedDate && formatDateTitle(new Date(selectedDate))} 업무일지
          </h2>
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
                    <select
                      value={entry.project}
                      onChange={(e) =>
                        handleEntryChange(index, "project", e.target.value)
                      }
                      className="border rounded px-3 py-1.5 text-sm"
                    >
                      <option value="">프로젝트 선택</option>
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
                  placeholder="업무 내용을 입력하세요..."
                  rows={4}
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
    </div>
  );
}
