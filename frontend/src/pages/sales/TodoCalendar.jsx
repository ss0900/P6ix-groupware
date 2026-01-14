// src/pages/sales/TodoCalendar.jsx
// 영업 TODO 캘린더 페이지
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { calendarApi } from "../../api/salesApi";
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Calendar as CalendarIcon,
  CheckCircle,
  Clock,
  Target,
  Filter,
} from "lucide-react";

// 요일 이름
const DAYS = ["일", "월", "화", "수", "목", "금", "토"];

// 월 이름
const MONTHS = [
  "1월", "2월", "3월", "4월", "5월", "6월",
  "7월", "8월", "9월", "10월", "11월", "12월",
];

// 날짜 유틸
const getMonthDays = (year, month) => {
  const firstDay = new Date(year, month, 1).getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();
  const prevLastDate = new Date(year, month, 0).getDate();
  
  const days = [];
  
  // 이전 달
  for (let i = firstDay - 1; i >= 0; i--) {
    days.push({
      date: prevLastDate - i,
      month: "prev",
      full: new Date(year, month - 1, prevLastDate - i),
    });
  }
  
  // 현재 달
  for (let i = 1; i <= lastDate; i++) {
    days.push({
      date: i,
      month: "current",
      full: new Date(year, month, i),
    });
  }
  
  // 다음 달
  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    days.push({
      date: i,
      month: "next",
      full: new Date(year, month + 1, i),
    });
  }
  
  return days;
};

// 날짜 포맷
const formatDate = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const isSameDate = (date1, date2) => {
  return formatDate(date1) === formatDate(date2);
};

const isToday = (date) => {
  return isSameDate(date, new Date());
};

// 이벤트 뱃지
const EventBadge = ({ event }) => {
  const config = {
    task: {
      bg: event.is_completed ? "bg-gray-300" : "bg-blue-500",
      text: "text-white",
      icon: event.is_completed ? CheckCircle : Clock,
    },
    deadline: {
      bg: "bg-red-500",
      text: "text-white",
      icon: Target,
    },
  };
  
  const c = config[event.type] || config.task;
  const Icon = c.icon;
  
  return (
    <div
      className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-xs truncate ${c.bg} ${c.text}`}
      title={event.title}
    >
      <Icon size={10} />
      <span className="truncate">{event.title}</span>
    </div>
  );
};

// 캘린더 셀
const CalendarCell = ({ day, events, onClick, isSelected }) => {
  const dayEvents = events.filter((e) => isSameDate(e.date, day.full));
  const isCurrentMonth = day.month === "current";
  const today = isToday(day.full);
  
  return (
    <div
      onClick={() => onClick(day.full)}
      className={`min-h-[100px] p-1 border-b border-r border-gray-200 cursor-pointer transition-colors ${
        isCurrentMonth ? "bg-white" : "bg-gray-50"
      } ${isSelected ? "ring-2 ring-blue-500 ring-inset" : ""} hover:bg-blue-50`}
    >
      <div className="flex items-center justify-between mb-1">
        <span
          className={`text-sm font-medium ${
            isCurrentMonth ? "text-gray-900" : "text-gray-400"
          } ${today ? "w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center" : ""}`}
        >
          {day.date}
        </span>
        {dayEvents.length > 0 && (
          <span className="text-xs text-gray-400">{dayEvents.length}</span>
        )}
      </div>
      <div className="space-y-1">
        {dayEvents.slice(0, 3).map((event) => (
          <EventBadge key={event.id} event={event} />
        ))}
        {dayEvents.length > 3 && (
          <div className="text-xs text-gray-400">
            +{dayEvents.length - 3} 더보기
          </div>
        )}
      </div>
    </div>
  );
};

export default function TodoCalendar() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showCompleted, setShowCompleted] = useState(true);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const days = getMonthDays(year, month);

  // 데이터 로드
  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const startDate = formatDate(new Date(year, month, 1));
      const endDate = formatDate(new Date(year, month + 1, 0));
      
      const res = await calendarApi.getEvents({ start: startDate, end: endDate });
      setEvents(res.data || []);
    } catch (err) {
      console.error("이벤트 로드 실패:", err);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // 이전/다음 달
  const goToPrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  // 날짜 선택
  const handleDateClick = (date) => {
    setSelectedDate(date);
  };

  // 선택한 날짜의 이벤트
  const selectedEvents = selectedDate
    ? events.filter((e) => isSameDate(e.date, selectedDate))
    : [];

  // 필터링된 이벤트
  const filteredEvents = showCompleted
    ? events
    : events.filter((e) => e.type !== "task" || !e.is_completed);

  return (
    <div className="h-full flex flex-col">
      {/* 헤더 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white flex-shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-gray-900">TODO 캘린더</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={goToPrevMonth}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="text-lg font-semibold min-w-[120px] text-center">
              {year}년 {MONTHS[month]}
            </span>
            <button
              onClick={goToNextMonth}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ChevronRight size={20} />
            </button>
          </div>
          <button
            onClick={goToToday}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            오늘
          </button>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={showCompleted}
              onChange={(e) => setShowCompleted(e.target.checked)}
              className="rounded"
            />
            완료된 항목 표시
          </label>
          <button
            onClick={loadEvents}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            title="새로고침"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* 캘린더 */}
      <div className="flex-1 flex">
        {/* 캘린더 그리드 */}
        <div className="flex-1 overflow-auto">
          {/* 요일 헤더 */}
          <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50 sticky top-0">
            {DAYS.map((day, idx) => (
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

          {/* 날짜 그리드 */}
          <div className="grid grid-cols-7">
            {days.map((day, idx) => (
              <CalendarCell
                key={idx}
                day={day}
                events={filteredEvents}
                onClick={handleDateClick}
                isSelected={selectedDate && isSameDate(day.full, selectedDate)}
              />
            ))}
          </div>
        </div>

        {/* 사이드바 - 선택한 날짜 일정 */}
        {selectedDate && (
          <div className="w-80 border-l border-gray-200 bg-white overflow-y-auto">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-800">
                {formatDate(selectedDate)}
              </h3>
              <p className="text-sm text-gray-500">
                {selectedEvents.length}개의 일정
              </p>
            </div>
            <div className="p-4 space-y-3">
              {selectedEvents.length === 0 ? (
                <p className="text-center py-8 text-gray-400">일정이 없습니다.</p>
              ) : (
                selectedEvents.map((event) => (
                  <div
                    key={event.id}
                    onClick={() => event.lead_id && navigate(`/sales/opportunities/${event.lead_id}`)}
                    className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {event.type === "task" ? (
                        event.is_completed ? (
                          <CheckCircle size={16} className="text-green-500" />
                        ) : (
                          <Clock size={16} className="text-blue-500" />
                        )
                      ) : (
                        <Target size={16} className="text-red-500" />
                      )}
                      <span
                        className={`font-medium ${
                          event.is_completed ? "line-through text-gray-400" : "text-gray-900"
                        }`}
                      >
                        {event.title}
                      </span>
                    </div>
                    {event.lead_title && (
                      <p className="text-xs text-gray-500 ml-6">
                        {event.lead_title}
                      </p>
                    )}
                    {event.assignee && (
                      <p className="text-xs text-gray-400 ml-6">
                        담당: {event.assignee}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* 범례 */}
      <div className="flex items-center gap-6 p-3 border-t border-gray-200 bg-gray-50 text-xs text-gray-600">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-blue-500 rounded" />
          <span>태스크</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-gray-300 rounded" />
          <span>완료된 태스크</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-red-500 rounded" />
          <span>마감일</span>
        </div>
      </div>
    </div>
  );
}
