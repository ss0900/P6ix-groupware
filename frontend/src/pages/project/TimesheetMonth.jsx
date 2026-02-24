// src/pages/project/TimesheetMonth.jsx
// 타임시트 월간 입력
import React, { useState, useEffect, useCallback } from "react";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Save,
  RefreshCw,
  Printer,
} from "lucide-react";
import ProjectService from "../../api/project";

// 날짜 유틸
const getMonthDates = (year, month) => {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  
  const dates = [];
  for (let d = 1; d <= lastDay.getDate(); d++) {
    dates.push(new Date(year, month, d));
  }
  return dates;
};

const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatMonthTitle = (year, month) => {
  return `${year}년 ${month + 1}월`;
};

export default function TimesheetMonth() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [monthDates, setMonthDates] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState("");
  const [entries, setEntries] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // 월간 날짜 계산
  useEffect(() => {
    setMonthDates(getMonthDates(year, month));
  }, [year, month]);

  // 프로젝트 목록 로드
  const loadProjects = useCallback(async () => {
    try {
      const data = await ProjectService.getProjects({ ordering: "name" });
      const projectList = Array.isArray(data) ? data : data.results || [];
      setProjects(projectList);
      if (projectList.length > 0 && !selectedProject) {
        setSelectedProject(projectList[0].id.toString());
      }
    } catch (err) {
      console.error("Failed to load projects", err);
    }
  }, [selectedProject]);

  // 타임시트 데이터 로드
  const loadTimesheets = useCallback(async () => {
    if (monthDates.length === 0) return;
    
    setLoading(true);
    try {
      const startDate = formatDate(monthDates[0]);
      const endDate = formatDate(monthDates[monthDates.length - 1]);
      
      const params = {
        start_date: startDate,
        end_date: endDate,
      };
      
      if (selectedProject) {
        params.project_id = selectedProject;
      }
      
      const data = await ProjectService.getTimesheets(params);
      const entryList = Array.isArray(data) ? data : data.results || [];
      
      // 날짜별로 매핑
      const entryMap = {};
      entryList.forEach((entry) => {
        entryMap[entry.work_date] = parseFloat(entry.hours) || 0;
      });
      
      setEntries(entryMap);
    } catch (err) {
      console.error("Failed to load timesheets", err);
      setEntries({});
    } finally {
      setLoading(false);
    }
  }, [monthDates, selectedProject]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    loadTimesheets();
  }, [loadTimesheets]);

  const handleHoursChange = (dateStr, value) => {
    setEntries((prev) => ({
      ...prev,
      [dateStr]: parseFloat(value) || 0,
    }));
  };

  const getMonthTotal = () => {
    return Object.values(entries).reduce((sum, h) => sum + (parseFloat(h) || 0), 0);
  };

  const getWeekTotal = (weekStartIndex, weekLength) => {
    let total = 0;
    for (let i = weekStartIndex; i < weekStartIndex + weekLength && i < monthDates.length; i++) {
      const dateStr = formatDate(monthDates[i]);
      total += parseFloat(entries[dateStr]) || 0;
    }
    return total;
  };

  const handlePrevMonth = () => {
    if (month === 0) {
      setYear(year - 1);
      setMonth(11);
    } else {
      setMonth(month - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 11) {
      setYear(year + 1);
      setMonth(0);
    } else {
      setMonth(month + 1);
    }
  };

  const handleThisMonth = () => {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
  };

  const handleSave = async () => {
    if (!selectedProject) {
      alert("프로젝트를 선택해주세요.");
      return;
    }
    
    setSaving(true);
    try {
      for (const [dateStr, hours] of Object.entries(entries)) {
        if (hours > 0) {
          await ProjectService.upsertTimesheet({
            work_date: dateStr,
            project: parseInt(selectedProject),
            task: null,
            hours: hours,
            memo: "",
          });
        }
      }
      alert("저장되었습니다.");
    } catch (err) {
      console.error("Failed to save", err);
      alert("저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  // 달력 그리드 생성
  const renderCalendar = () => {
    if (monthDates.length === 0) return null;
    
    const firstDayOfWeek = monthDates[0].getDay(); // 0 = 일요일
    const weeks = [];
    let currentWeek = [];
    
    // 첫째 주 앞부분 빈칸
    for (let i = 0; i < firstDayOfWeek; i++) {
      currentWeek.push(null);
    }
    
    // 날짜 채우기
    monthDates.forEach((date, index) => {
      currentWeek.push(date);
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    });
    
    // 마지막 주 뒷부분 빈칸
    while (currentWeek.length > 0 && currentWeek.length < 7) {
      currentWeek.push(null);
    }
    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }
    
    return weeks;
  };

  const weeks = renderCalendar();
  const dayLabels = ["일", "월", "화", "수", "목", "금", "토"];

  return (
    <div className="p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Calendar className="text-blue-500" size={24} />
          <h1 className="text-xl font-bold text-gray-900">타임시트 [월간]</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadTimesheets}
            className="p-2 hover:bg-gray-100 rounded text-gray-600"
            disabled={loading}
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
          <button className="btn-basic flex items-center gap-1">
            <Printer size={16} />
            인쇄
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

      {/* 월간 네비게이션 */}
      <div className="bg-white border rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevMonth}
              className="p-2 hover:bg-gray-100 rounded"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={handleThisMonth}
              className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
            >
              이번 달
            </button>
            <button
              onClick={handleNextMonth}
              className="p-2 hover:bg-gray-100 rounded"
            >
              <ChevronRight size={20} />
            </button>
          </div>
          <span className="text-lg font-medium text-gray-700">
            {formatMonthTitle(year, month)}
          </span>
          <div className="flex items-center gap-4">
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="border rounded px-3 py-1 text-sm"
            >
              <option value="">프로젝트 선택</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <div className="text-sm text-gray-500">
              월간 합계: <span className="font-bold text-blue-600">{getMonthTotal().toFixed(1)}h</span>
            </div>
          </div>
        </div>
      </div>

      {/* 월간 캘린더 그리드 */}
      <div className="bg-white border rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent" />
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                {dayLabels.map((label, i) => (
                  <th
                    key={i}
                    className={`px-2 py-3 text-center font-medium ${
                      i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : "text-gray-700"
                    }`}
                  >
                    {label}
                  </th>
                ))}
                <th className="px-2 py-3 text-center font-medium text-gray-700 w-20">
                  주간 합계
                </th>
              </tr>
            </thead>
            <tbody>
              {weeks?.map((week, weekIndex) => (
                <tr key={weekIndex} className="border-b">
                  {week.map((date, dayIndex) => {
                    if (!date) {
                      return (
                        <td key={dayIndex} className="px-2 py-2 bg-gray-50" />
                      );
                    }
                    
                    const dateStr = formatDate(date);
                    const isToday = dateStr === formatDate(today);
                    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                    
                    return (
                      <td
                        key={dayIndex}
                        className={`px-2 py-2 ${isWeekend ? "bg-gray-50" : ""}`}
                      >
                        <div className="text-center">
                          <div
                            className={`text-xs mb-1 ${
                              isToday
                                ? "bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center mx-auto"
                                : date.getDay() === 0
                                ? "text-red-500"
                                : date.getDay() === 6
                                ? "text-blue-500"
                                : "text-gray-600"
                            }`}
                          >
                            {date.getDate()}
                          </div>
                          <input
                            type="number"
                            min="0"
                            max="24"
                            step="0.5"
                            value={entries[dateStr] || ""}
                            onChange={(e) =>
                              handleHoursChange(dateStr, e.target.value)
                            }
                            className="w-full border rounded px-1 py-1 text-sm text-center"
                            placeholder="-"
                          />
                        </div>
                      </td>
                    );
                  })}
                  <td className="px-2 py-2 text-center font-medium text-blue-600 bg-blue-50">
                    {(() => {
                      const validDates = week.filter((d) => d !== null);
                      if (validDates.length === 0) return "-";
                      const startIdx = monthDates.findIndex(
                        (d) => formatDate(d) === formatDate(validDates[0])
                      );
                      return getWeekTotal(startIdx, validDates.length).toFixed(1) + "h";
                    })()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 안내 */}
      <div className="mt-4 text-sm text-gray-500">
        <p>• 각 날짜에 해당 프로젝트에 사용한 시간을 입력하세요 (0.5 단위)</p>
        <p>• 저장 버튼을 눌러 데이터를 저장하세요</p>
      </div>
    </div>
  );
}
