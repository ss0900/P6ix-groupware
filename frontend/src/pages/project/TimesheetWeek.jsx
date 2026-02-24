// src/pages/project/TimesheetWeek.jsx
// 타임시트 주간 입력
import React, { useState, useEffect, useCallback } from "react";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Save,
  Plus,
  Trash2,
  RefreshCw,
  Printer,
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

const formatDateShort = (date) => {
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return `${date.getMonth() + 1}/${date.getDate()}(${days[date.getDay()]})`;
};

const formatWeekRange = (dates) => {
  if (dates.length === 0) return "";
  const start = dates[0];
  const end = dates[dates.length - 1];
  return `${start.getFullYear()}년 ${start.getMonth() + 1}월 ${start.getDate()}일 ~ ${end.getMonth() + 1}월 ${end.getDate()}일`;
};

export default function TimesheetWeek() {
  const [baseDate, setBaseDate] = useState(new Date());
  const [weekDates, setWeekDates] = useState([]);
  const [projects, setProjects] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // 주간 날짜 계산
  useEffect(() => {
    setWeekDates(getWeekDates(baseDate));
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

  // 타임시트 데이터 로드
  const loadTimesheets = useCallback(async () => {
    if (weekDates.length === 0) return;
    
    setLoading(true);
    try {
      const startDate = formatDate(weekDates[0]);
      const endDate = formatDate(weekDates[6]);
      
      const data = await ProjectService.getTimesheets({
        start_date: startDate,
        end_date: endDate,
      });
      
      const entries = Array.isArray(data) ? data : data.results || [];
      
      // 프로젝트별로 그룹화
      const projectMap = new Map();
      entries.forEach((entry) => {
        const projectId = entry.project || "unassigned";
        if (!projectMap.has(projectId)) {
          projectMap.set(projectId, {
            projectId,
            projectName: entry.project_name || "미분류",
            hours: {},
            memos: {},
          });
        }
        const row = projectMap.get(projectId);
        row.hours[entry.work_date] = parseFloat(entry.hours) || 0;
        row.memos[entry.work_date] = entry.memo || "";
      });
      
      // 빈 행 포함하여 rows 설정
      if (projectMap.size === 0) {
        setRows([createEmptyRow()]);
      } else {
        setRows(Array.from(projectMap.values()));
      }
    } catch (err) {
      console.error("Failed to load timesheets", err);
      setRows([createEmptyRow()]);
    } finally {
      setLoading(false);
    }
  }, [weekDates]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    loadTimesheets();
  }, [loadTimesheets]);

  const createEmptyRow = () => ({
    projectId: "",
    projectName: "",
    hours: {},
    memos: {},
  });

  const handleAddRow = () => {
    setRows((prev) => [...prev, createEmptyRow()]);
  };

  const handleRemoveRow = (index) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleProjectChange = (index, projectId) => {
    const project = projects.find((p) => p.id === parseInt(projectId));
    setRows((prev) =>
      prev.map((row, i) =>
        i === index
          ? {
              ...row,
              projectId: projectId ? parseInt(projectId) : "",
              projectName: project?.name || "",
            }
          : row
      )
    );
  };

  const handleHoursChange = (rowIndex, date, value) => {
    setRows((prev) =>
      prev.map((row, i) =>
        i === rowIndex
          ? {
              ...row,
              hours: {
                ...row.hours,
                [date]: parseFloat(value) || 0,
              },
            }
          : row
      )
    );
  };

  const getRowTotal = (row) => {
    return Object.values(row.hours).reduce((sum, h) => sum + (parseFloat(h) || 0), 0);
  };

  const getDayTotal = (dateStr) => {
    return rows.reduce((sum, row) => sum + (parseFloat(row.hours[dateStr]) || 0), 0);
  };

  const getGrandTotal = () => {
    return rows.reduce((sum, row) => sum + getRowTotal(row), 0);
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
    setSaving(true);
    try {
      // 각 셀을 upsert
      for (const row of rows) {
        if (!row.projectId) continue;
        
        for (const date of weekDates) {
          const dateStr = formatDate(date);
          const hours = parseFloat(row.hours[dateStr]) || 0;
          
          if (hours > 0) {
            await ProjectService.upsertTimesheet({
              work_date: dateStr,
              project: row.projectId,
              task: null,
              hours: hours,
              memo: row.memos[dateStr] || "",
            });
          }
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

  return (
    <div className="p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Calendar className="text-blue-500" size={24} />
          <h1 className="text-xl font-bold text-gray-900">타임시트 [주간]</h1>
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

      {/* 주간 네비게이션 */}
      <div className="bg-white border rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between">
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
          <div className="text-sm text-gray-500">
            주간 합계: <span className="font-bold text-blue-600">{getGrandTotal().toFixed(1)}h</span>
          </div>
        </div>
      </div>

      {/* 타임시트 그리드 */}
      <div className="bg-white border rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-3 py-3 text-left font-medium text-gray-700 min-w-[200px]">
                    프로젝트
                  </th>
                  {weekDates.map((date, i) => (
                    <th
                      key={i}
                      className={`px-2 py-3 text-center font-medium min-w-[70px] ${
                        date.getDay() === 0 || date.getDay() === 6
                          ? "text-red-500 bg-red-50"
                          : "text-gray-700"
                      }`}
                    >
                      {formatDateShort(date)}
                    </th>
                  ))}
                  <th className="px-3 py-3 text-right font-medium text-gray-700 min-w-[70px]">
                    합계
                  </th>
                  <th className="px-2 py-3 text-center font-medium text-gray-700 w-10" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIndex) => (
                  <tr key={rowIndex} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <select
                        value={row.projectId}
                        onChange={(e) =>
                          handleProjectChange(rowIndex, e.target.value)
                        }
                        className="w-full border rounded px-2 py-1.5 text-sm"
                      >
                        <option value="">프로젝트 선택</option>
                        {projects.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    {weekDates.map((date, i) => {
                      const dateStr = formatDate(date);
                      return (
                        <td key={i} className="px-1 py-2">
                          <input
                            type="number"
                            min="0"
                            max="24"
                            step="0.5"
                            value={row.hours[dateStr] || ""}
                            onChange={(e) =>
                              handleHoursChange(rowIndex, dateStr, e.target.value)
                            }
                            className={`w-full border rounded px-2 py-1.5 text-sm text-center ${
                              date.getDay() === 0 || date.getDay() === 6
                                ? "bg-red-50"
                                : ""
                            }`}
                            placeholder="-"
                          />
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-right font-medium text-blue-600">
                      {getRowTotal(row).toFixed(1)}h
                    </td>
                    <td className="px-2 py-2 text-center">
                      {rows.length > 1 && (
                        <button
                          onClick={() => handleRemoveRow(rowIndex)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {/* 합계 행 */}
                <tr className="bg-blue-50 border-t-2 border-blue-200">
                  <td className="px-3 py-2 font-medium text-gray-700">일별 합계</td>
                  {weekDates.map((date, i) => {
                    const dateStr = formatDate(date);
                    return (
                      <td key={i} className="px-2 py-2 text-center font-medium text-blue-600">
                        {getDayTotal(dateStr).toFixed(1)}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-right font-bold text-blue-700">
                    {getGrandTotal().toFixed(1)}h
                  </td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* 행 추가 버튼 */}
        <div className="p-3 border-t bg-gray-50">
          <button
            onClick={handleAddRow}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
          >
            <Plus size={16} />
            프로젝트 추가
          </button>
        </div>
      </div>

      {/* 안내 */}
      <div className="mt-4 text-sm text-gray-500">
        <p>• 각 셀에 해당 날짜에 사용한 시간을 입력하세요 (0.5 단위)</p>
        <p>• 저장 버튼을 눌러 데이터를 저장하세요</p>
      </div>
    </div>
  );
}
