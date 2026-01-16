// src/pages/schedule/ScheduleCalendar.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  addMonths,
  subMonths,
  isSameDay,
  isToday,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Plus,
  Printer,
  Search,
  X,
} from "lucide-react";
import { scheduleApi, calendarApi } from "../../api/schedule";
import api from "../../api/axios";
import ScheduleForm from "./ScheduleForm";
import ScheduleDetail from "./ScheduleDetail";

// 이벤트 타입별 색상
const EVENT_TYPE_STYLES = {
  general: { bg: "bg-gray-100", text: "text-gray-700", label: "일반" },
  annual: { bg: "bg-yellow-100", text: "text-yellow-800", label: "연차" },
  monthly: { bg: "bg-orange-100", text: "text-orange-700", label: "월차" },
  half: { bg: "bg-blue-100", text: "text-blue-700", label: "반차" },
  meeting: { bg: "bg-purple-100", text: "text-purple-700", label: "회의" },
  trip: { bg: "bg-green-100", text: "text-green-700", label: "출장" },
};

// Scope별 타이틀
const SCOPE_TITLES = {
  all: "전체 일정",
  shared: "공유 일정",
  personal: "개인 일정",
};

// 카테고리별 타이틀
const CATEGORY_TITLES = {
  headquarters: "본사일정",
};

export default function ScheduleCalendar({ scope, category }) {
  const { calendarId } = useParams();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [calendarInfo, setCalendarInfo] = useState(null);

  // 검색
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // 회사 ID
  const [companyId, setCompanyId] = useState(null);

  // 패널 상태
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelMode, setPanelMode] = useState(null);
  const [activeItem, setActiveItem] = useState(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // 페이지 제목 결정
  const pageTitle = useMemo(() => {
    if (scope) return SCOPE_TITLES[scope] || "일정";
    if (category) return CATEGORY_TITLES[category] || "카테고리 일정";
    if (calendarId && calendarInfo) return calendarInfo.name;
    return "일정";
  }, [scope, category, calendarId, calendarInfo]);

  // 사용자 정보 로드
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

  // 캘린더 정보 로드 (사용자 정의 캘린더일 때)
  useEffect(() => {
    if (calendarId && calendarId !== "custom") {
      (async () => {
        try {
          const res = await calendarApi.detail(calendarId);
          setCalendarInfo(res.data);
        } catch (err) {
          console.error("캘린더 정보 로드 실패:", err);
        }
      })();
    }
  }, [calendarId]);

  // 일정 데이터 로드
  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    try {
      const start = format(startOfMonth(currentDate), "yyyy-MM-dd");
      const end = format(endOfMonth(currentDate), "yyyy-MM-dd");

      const params = {
        date_from: start,
        date_to: end,
        search: searchQuery || undefined,
      };

      // scope 필터
      if (scope === "personal") {
        params.scope = "personal";
      } else if (scope === "shared") {
        params.scope = "company";
      }

      // 카테고리 또는 캘린더 ID 필터
      if (calendarId && calendarId !== "custom") {
        params.calendar_ids = calendarId;
      }

      const res = await scheduleApi.list(params);
      const data = res.data?.results ?? res.data ?? [];
      setSchedules(data);
    } catch (err) {
      console.error("일정 목록 조회 실패:", err);
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  }, [currentDate, searchQuery, scope, calendarId]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  // 월 이동
  const goToPrevYear = () => setCurrentDate(addMonths(currentDate, -12));
  const goToPrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const goToNextYear = () => setCurrentDate(addMonths(currentDate, 12));
  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };
  const goToThisWeek = () => {
    setCurrentDate(new Date());
  };

  // 캘린더 날짜 생성 (6주 그리드)
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const start = startOfWeek(monthStart, { weekStartsOn: 0 });
    const end = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  // 날짜별 일정 필터
  const getSchedulesForDate = useCallback(
    (date) => {
      if (!date) return [];
      const dateStr = format(date, "yyyy-MM-dd");

      return schedules
        .filter((s) => {
          const startDate = (s.start || "").slice(0, 10);
          const endDate = (s.end || s.start || "").slice(0, 10);
          return startDate <= dateStr && endDate >= dateStr;
        })
        .sort((a, b) => String(a.start || "").localeCompare(String(b.start || "")));
    },
    [schedules]
  );

  // 패널 함수들
  const openCreate = (date) => {
    setSelectedDate(date || new Date());
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

  // 기본 scope 결정 (일정 생성 시)
  const defaultScope = scope === "personal" ? "personal" : "company";

  return (
    <div className="flex-1 flex flex-col bg-white h-full">
      {/* 상단 헤더 */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <span className="text-gray-400">≡</span>
            {pageTitle}
          </h1>

          {/* 액션 버튼들 */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => openCreate()}
              className="flex items-center gap-2 px-3 py-1.5 bg-sky-500 text-white rounded hover:bg-sky-600"
            >
              <Plus size={16} />
              일정 쓰기
            </button>
            <button
              onClick={goToThisWeek}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50"
            >
              금주일정
            </button>
            <button
              onClick={goToToday}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50"
            >
              오늘일정
            </button>
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 flex items-center gap-1"
            >
              <Printer size={14} />
              인쇄
            </button>
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 flex items-center gap-1"
            >
              <Search size={14} />
              검색
            </button>

            {/* 월 네비게이션 */}
            <div className="flex items-center gap-1 ml-4">
              <button onClick={goToPrevYear} className="p-1 hover:bg-gray-100 rounded">
                <ChevronsLeft size={18} />
              </button>
              <button onClick={goToPrevMonth} className="p-1 hover:bg-gray-100 rounded">
                <ChevronLeft size={18} />
              </button>
              <span className="px-3 text-sm font-medium text-gray-700">
                {year}-{String(month + 1).padStart(2, "0")}
              </span>
              <button onClick={goToNextMonth} className="p-1 hover:bg-gray-100 rounded">
                <ChevronRight size={18} />
              </button>
              <button onClick={goToNextYear} className="p-1 hover:bg-gray-100 rounded">
                <ChevronsRight size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* 검색 입력 */}
        {searchOpen && (
          <div className="mt-3 flex items-center gap-2">
            <input
              type="text"
              placeholder="일정 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            <button
              onClick={() => {
                setSearchQuery("");
                setSearchOpen(false);
              }}
              className="p-2 text-gray-500 hover:text-gray-700"
            >
              <X size={18} />
            </button>
          </div>
        )}
      </div>

      {/* 캘린더 그리드 */}
      <div className="flex-1 overflow-auto">
        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
          {["일", "월", "화", "수", "목", "금", "토"].map((day, idx) => (
            <div
              key={day}
              className={`py-2 text-center text-sm font-medium border-r last:border-r-0 ${
                idx === 0 ? "text-red-500" : idx === 6 ? "text-blue-500" : "text-gray-600"
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* 날짜 그리드 */}
        <div className="grid grid-cols-7 flex-1">
          {calendarDays.map((date, idx) => {
            const isCurrentMonth = date.getMonth() === month;
            const isTodayDate = isToday(date);
            const isSelected = isSameDay(date, selectedDate);
            const dayOfWeek = getDay(date);
            const daySchedules = getSchedulesForDate(date);

            return (
              <div
                key={idx}
                onClick={() => setSelectedDate(date)}
                className={`
                  min-h-[100px] border-b border-r border-gray-200 p-1 cursor-pointer transition-colors
                  ${!isCurrentMonth ? "bg-gray-50" : "bg-white"}
                  ${isSelected ? "bg-sky-50 ring-1 ring-sky-300 ring-inset" : ""}
                  hover:bg-gray-50
                `}
              >
                {/* 날짜 숫자 */}
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`
                      text-sm font-medium px-1
                      ${!isCurrentMonth ? "text-gray-400" : ""}
                      ${isTodayDate ? "bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center" : ""}
                      ${!isTodayDate && dayOfWeek === 0 ? "text-red-500" : ""}
                      ${!isTodayDate && dayOfWeek === 6 ? "text-blue-500" : ""}
                    `}
                  >
                    {format(date, "d")}
                  </span>
                  {isTodayDate && (
                    <span className="text-xs text-red-500 font-medium">오늘</span>
                  )}
                </div>

                {/* 일정 목록 */}
                <div className="space-y-0.5 overflow-hidden">
                  {daySchedules.slice(0, 4).map((schedule) => {
                    const typeStyle = EVENT_TYPE_STYLES[schedule.event_type] || EVENT_TYPE_STYLES.general;
                    const time = schedule.is_all_day
                      ? ""
                      : format(new Date(schedule.start), "HH:mm");

                    return (
                      <div
                        key={schedule.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          openView(schedule);
                        }}
                        className={`
                          text-xs px-1 py-0.5 rounded truncate cursor-pointer
                          hover:opacity-80 transition-opacity
                          ${typeStyle.bg} ${typeStyle.text}
                        `}
                        title={schedule.title}
                      >
                        {schedule.is_urgent && <span className="text-red-600">⚡</span>}
                        {schedule.event_type !== "general" && (
                          <span className="font-medium">[{typeStyle.label}] </span>
                        )}
                        {time && <span className="text-gray-500">{time} </span>}
                        {schedule.owner_name && (
                          <span className="text-gray-600">{schedule.owner_name} </span>
                        )}
                        {schedule.title}
                      </div>
                    );
                  })}
                  {daySchedules.length > 4 && (
                    <div className="text-xs text-gray-500 px-1">
                      +{daySchedules.length - 4}건 더보기
                    </div>
                  )}
                </div>
              </div>
            );
          })}
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
                  defaultScope={defaultScope}
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
                  onRsvpChanged={fetchSchedules}
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
