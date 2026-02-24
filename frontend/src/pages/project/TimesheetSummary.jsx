// src/pages/project/TimesheetSummary.jsx
// 타임시트 집계
import React, { useState, useEffect, useCallback } from "react";
import {
  BarChart3,
  Calendar,
  RefreshCw,
  Download,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import ProjectService from "../../api/project";

const formatMonth = (year, month) => {
  return `${year}년 ${month + 1}월`;
};

export default function TimesheetSummary() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [groupBy, setGroupBy] = useState("project"); // project, month
  const [summary, setSummary] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    try {
      const startDate = `${year}-${String(month + 1).padStart(2, "0")}-01`;
      const endDate = new Date(year, month + 1, 0);
      const endDateStr = endDate.toISOString().split("T")[0];

      const data = await ProjectService.getTimesheetSummary({
        start_date: startDate,
        end_date: endDateStr,
        group_by: groupBy,
      });

      if (Array.isArray(data)) {
        setSummary(data);
        const t = data.reduce((sum, item) => sum + (item.total_hours || 0), 0);
        setTotal(t);
      } else {
        setSummary([]);
        setTotal(data.total_hours || 0);
      }
    } catch (err) {
      console.error("Failed to load summary", err);
      setSummary([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [year, month, groupBy]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

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

  const maxHours = summary.length > 0 
    ? Math.max(...summary.map((s) => s.total_hours || 0)) 
    : 100;

  return (
    <div className="p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <BarChart3 className="text-blue-500" size={24} />
          <h1 className="text-xl font-bold text-gray-900">타임시트 [집계]</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadSummary}
            className="p-2 hover:bg-gray-100 rounded text-gray-600"
            disabled={loading}
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
          <button className="btn-basic flex items-center gap-1">
            <Download size={16} />
            엑셀 다운로드
          </button>
        </div>
      </div>

      {/* 필터 */}
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
            <span className="text-lg font-medium text-gray-700 ml-4">
              {formatMonth(year, month)}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">집계 기준:</span>
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value)}
                className="border rounded px-3 py-1 text-sm"
              >
                <option value="project">프로젝트별</option>
                <option value="month">월별</option>
                <option value="total">전체</option>
              </select>
            </div>
            <div className="text-sm text-gray-700">
              총 합계:{" "}
              <span className="font-bold text-blue-600 text-lg">
                {total.toFixed(1)}h
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 집계 결과 */}
      <div className="bg-white border rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent" />
          </div>
        ) : summary.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <BarChart3 size={48} className="mx-auto mb-4 text-gray-300" />
            <p>집계 데이터가 없습니다.</p>
          </div>
        ) : (
          <div className="p-6">
            {/* 차트 (바 그래프) */}
            <div className="space-y-4 mb-6">
              {summary.map((item, index) => {
                const percentage = maxHours > 0 ? (item.total_hours / maxHours) * 100 : 0;
                const label = groupBy === "project" 
                  ? item.project_name 
                  : groupBy === "month" 
                  ? item.month 
                  : "전체";
                
                return (
                  <div key={index} className="flex items-center gap-4">
                    <div className="w-40 text-sm text-gray-700 truncate">
                      {label}
                    </div>
                    <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                      <div
                        className="bg-blue-500 h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                        style={{ width: `${Math.max(percentage, 5)}%` }}
                      >
                        <span className="text-xs text-white font-medium">
                          {item.total_hours.toFixed(1)}h
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 테이블 */}
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-y">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">
                    {groupBy === "project" ? "프로젝트" : groupBy === "month" ? "월" : "항목"}
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-gray-700">
                    시간
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-gray-700">
                    비율
                  </th>
                </tr>
              </thead>
              <tbody>
                {summary.map((item, index) => {
                  const label = groupBy === "project" 
                    ? item.project_name 
                    : groupBy === "month" 
                    ? item.month 
                    : "전체";
                  const percentage = total > 0 ? ((item.total_hours / total) * 100).toFixed(1) : 0;
                  
                  return (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3">{label}</td>
                      <td className="px-4 py-3 text-right font-medium text-blue-600">
                        {item.total_hours.toFixed(1)}h
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500">
                        {percentage}%
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-blue-50 font-medium">
                  <td className="px-4 py-3">합계</td>
                  <td className="px-4 py-3 text-right text-blue-700">
                    {total.toFixed(1)}h
                  </td>
                  <td className="px-4 py-3 text-right text-blue-700">
                    100%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
