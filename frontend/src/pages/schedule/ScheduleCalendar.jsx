// src/pages/schedule/ScheduleCalendar.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isSameDay, isToday } from "date-fns";
import { ko } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus, Clock, User } from "lucide-react";
import { scheduleApi } from "../../api/schedule";
import api from "../../api/axios";
import ScheduleForm from "./ScheduleForm";
import ScheduleDetail from "./ScheduleDetail";

export default function ScheduleCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // scope 필터
  const [selectedScopes, setSelectedScopes] = useState(["personal", "company"]);
  
  // 회사 ID (로그인 사용자 기준)
  const [companyId, setCompanyId] = useState(null);
  
  // 패널 상태
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelMode, setPanelMode] = useState(null); // 'view' | 'create' | 'edit'
  const [activeItem, setActiveItem] = useState(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // 회사 ID 로드
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/users/me/");
        if (res.data?.company) {
          setCompanyId(res.data.company);
        }
      } catch (err) {
        console.error("사용자 정보 로드 실패:", err);
      }
    })();
  }, []);

  // 일정 데이터 로드
  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    try {
      let all = [];
      
      if (selectedScopes.includes("personal")) {
        const res = await scheduleApi.listPersonal();
        all = [...all, ...(res.data?.results ?? res.data ?? [])];
      }
      
      if (selectedScopes.includes("company")) {
        const res = await scheduleApi.listCompany(companyId);
        all = [...all, ...(res.data?.results ?? res.data ?? [])];
      }
      
      // 중복 제거
      const uniqueById = new Map();
      all.forEach((s) => uniqueById.set(s.id, s));
      setSchedules([...uniqueById.values()]);
    } catch (err) {
      console.error("일정 목록 조회 실패:", err);
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  }, [selectedScopes, companyId]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  // scope 토글
  const toggleScope = (scope) => {
    setSelectedScopes((prev) =>
      prev.includes(scope)
        ? prev.filter((s) => s !== scope)
        : [...prev, scope]
    );
  };

  // 월 이동
  const goToPrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  // 캘린더 날짜 생성
  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    const days = eachDayOfInterval({ start, end });

    const startDay = getDay(start);
    const paddedDays = [];
    for (let i = 0; i < startDay; i++) {
      paddedDays.push(null);
    }

    return [...paddedDays, ...days];
  }, [currentDate]);

  // 날짜별 일정 필터
  const getSchedulesForDate = useCallback((date) => {
    if (!date) return [];
    const dateStr = format(date, "yyyy-MM-dd");
    return schedules.filter((s) => (s.start || "").slice(0, 10) === dateStr);
  }, [schedules]);

  // 날짜별 일정 개수 (scope별 색상)
  const statusCountsByDate = useMemo(() => {
    const counts = {};
    schedules.forEach((s) => {
      const dateStr = (s.start || "").slice(0, 10);
      if (!counts[dateStr]) {
        counts[dateStr] = { personal: 0, company: 0 };
      }
      if (s.scope === "personal") counts[dateStr].personal++;
      else counts[dateStr].company++;
    });
    return counts;
  }, [schedules]);

  // 선택된 날짜의 일정 목록
  const selectedDateSchedules = useMemo(() => {
    return getSchedulesForDate(selectedDate).sort((a, b) =>
      String(a.start || "").localeCompare(String(b.start || ""))
    );
  }, [selectedDate, getSchedulesForDate]);

  // 패널 열기 함수들
  const openCreate = () => {
    setActiveItem(null);
    setPanelMode("create");
    setPanelOpen(true);
  };

  const openView = (item) => {
    setActiveItem(item);
    setPanelMode("view");
    setPanelOpen(true);
  };

  const openEdit = (item) => {
    setActiveItem(item);
    setPanelMode("edit");
    setPanelOpen(true);
  };

  const closePanel = () => {
    setPanelOpen(false);
    setPanelMode(null);
    setActiveItem(null);
  };

  // scope별 색상
  const getScopeColor = (scope) => {
    return scope === "personal"
      ? { bg: "bg-green-100", text: "text-green-700", border: "border-green-300", dot: "bg-green-500" }
      : { bg: "bg-red-100", text: "text-red-700", border: "border-red-300", dot: "bg-red-500" };
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">일정 관리</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={18} />
          일정 등록
        </button>
      </div>

      {/* scope 필터 */}
      <div className="flex gap-2">
        {[
          { key: "personal", label: "개인", color: "green" },
          { key: "company", label: "회사", color: "red" },
        ].map((opt) => {
          const active = selectedScopes.includes(opt.key);
          return (
            <button
              key={opt.key}
              onClick={() => toggleScope(opt.key)}
              className={`
                px-4 py-2 rounded-full border text-sm font-medium transition-all
                ${active
                  ? opt.color === "green"
                    ? "bg-green-100 text-green-700 border-green-400"
                    : "bg-red-100 text-red-700 border-red-400"
                  : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"}
              `}
            >
              {opt.label}
            </button>
          );
        })}
        <button
          onClick={() => setSelectedScopes([])}
          className="px-4 py-2 border border-gray-300 rounded-full text-sm text-gray-600 hover:bg-gray-50"
        >
          전체 해제
        </button>
      </div>

      <div className="flex gap-6 items-start">
        {/* 좌측: 캘린더 */}
        <div className="w-[550px] bg-white rounded-xl border border-gray-200 p-4">
          {/* 캘린더 헤더 */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <button onClick={goToPrevMonth} className="p-2 hover:bg-gray-100 rounded-lg">
                <ChevronLeft size={20} />
              </button>
              <h2 className="text-xl font-semibold text-gray-900">
                {year}년 {month + 1}월
              </h2>
              <button onClick={goToNextMonth} className="p-2 hover:bg-gray-100 rounded-lg">
                <ChevronRight size={20} />
              </button>
            </div>
            <button
              onClick={goToToday}
              className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg"
            >
              오늘
            </button>
          </div>

          {/* 요일 헤더 */}
          <div className="grid grid-cols-7 mb-2">
            {["일", "월", "화", "수", "목", "금", "토"].map((day, idx) => (
              <div
                key={day}
                className={`py-2 text-center text-sm font-medium ${
                  idx === 0 ? "text-red-500" : idx === 6 ? "text-blue-500" : "text-gray-600"
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* 캘린더 그리드 */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((date, idx) => {
              if (!date) {
                return <div key={`empty-${idx}`} className="h-16" />;
              }

              const dateStr = format(date, "yyyy-MM-dd");
              const counts = statusCountsByDate[dateStr] || { personal: 0, company: 0 };
              const isSelected = isSameDay(date, selectedDate);
              const isTodayDate = isToday(date);
              const dayOfWeek = getDay(date);

              return (
                <div
                  key={dateStr}
                  onClick={() => setSelectedDate(date)}
                  className={`
                    h-16 p-1 rounded-lg cursor-pointer transition-all
                    ${isSelected ? "bg-blue-100 ring-2 ring-blue-500" : "hover:bg-gray-50"}
                  `}
                >
                  <div
                    className={`
                      text-sm font-medium
                      ${isTodayDate ? "bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center" : ""}
                      ${!isTodayDate && dayOfWeek === 0 ? "text-red-500" : ""}
                      ${!isTodayDate && dayOfWeek === 6 ? "text-blue-500" : ""}
                    `}
                  >
                    {format(date, "d")}
                  </div>
                  {/* scope별 dot */}
                  <div className="mt-1 flex justify-center gap-1">
                    {counts.personal > 0 && (
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                    )}
                    {counts.company > 0 && (
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 우측: 일정 목록 */}
        <div className="flex-1 bg-white rounded-xl border border-gray-200 p-4 max-h-[600px] overflow-y-auto">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {format(selectedDate, "yyyy년 M월 d일", { locale: ko })} 일정
          </h3>

          {loading ? (
            <p className="text-gray-500">로딩 중...</p>
          ) : selectedDateSchedules.length === 0 ? (
            <p className="text-gray-400">일정이 없습니다.</p>
          ) : (
            <div className="space-y-3">
              {selectedDateSchedules.map((schedule) => {
                const scopeStyle = getScopeColor(schedule.scope);
                return (
                  <div
                    key={schedule.id}
                    onClick={() => openView(schedule)}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Clock size={16} className="text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {format(new Date(schedule.start), "HH:mm")}
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 text-xs rounded-full border ${scopeStyle.bg} ${scopeStyle.text} ${scopeStyle.border}`}>
                        {schedule.scope === "personal" ? "개인" : "회사"}
                      </span>
                    </div>
                    <h4 className="font-medium text-gray-900 mt-2">{schedule.title}</h4>
                    <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                      <User size={14} />
                      <span>{schedule.owner_name}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 사이드 패널 */}
      {panelOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black bg-opacity-30" onClick={closePanel} />
          <div className="relative w-full max-w-md bg-white shadow-xl overflow-y-auto">
            <div className="p-6">
              {panelMode === "create" && (
                <ScheduleForm
                  mode="create"
                  initialDate={selectedDate}
                  companyId={companyId}
                  defaultScope={selectedScopes.length === 1 ? selectedScopes[0] : "personal"}
                  onSaved={() => {
                    fetchSchedules();
                    closePanel();
                  }}
                  onClose={closePanel}
                />
              )}
              {panelMode === "view" && activeItem && (
                <ScheduleDetail
                  item={activeItem}
                  onEdit={() => openEdit(activeItem)}
                  onDeleted={() => {
                    fetchSchedules();
                    closePanel();
                  }}
                  onClose={closePanel}
                />
              )}
              {panelMode === "edit" && activeItem && (
                <ScheduleForm
                  mode="edit"
                  initial={activeItem}
                  companyId={companyId}
                  onSaved={() => {
                    fetchSchedules();
                    closePanel();
                  }}
                  onClose={closePanel}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
