// src/pages/schedule/ScheduleCalendar.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Users
} from "lucide-react";

// 날짜 유틸
const getDaysInMonth = (year, month) => {
  return new Date(year, month + 1, 0).getDate();
};

const getFirstDayOfMonth = (year, month) => {
  return new Date(year, month, 1).getDay();
};

// 일정 색상
const getScheduleColor = (type) => {
  const colors = {
    personal: "bg-blue-500",
    team: "bg-green-500",
    company: "bg-purple-500",
    meeting: "bg-orange-500",
  };
  return colors[type] || "bg-gray-500";
};

// 일정 아이템
const ScheduleItem = ({ schedule, onClick }) => (
  <div
    onClick={(e) => { e.stopPropagation(); onClick(schedule); }}
    className={`text-xs px-1.5 py-0.5 rounded text-white truncate cursor-pointer hover:opacity-80 ${getScheduleColor(schedule.schedule_type)}`}
    title={schedule.title}
  >
    {schedule.title}
  </div>
);

export default function ScheduleCalendar() {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSchedule, setSelectedSchedule] = useState(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // 일정 로드
  const loadSchedules = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`meeting/schedules/?year=${year}&month=${month + 1}`);
      setSchedules(res.data?.results ?? res.data ?? []);
    } catch (err) {
      console.error("Failed to load schedules:", err);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    loadSchedules();
  }, [loadSchedules]);

  // 월 이동
  const goToPrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // 캘린더 생성
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const today = new Date();

  const calendarDays = [];
  
  // 이전 달 날짜
  const prevMonthDays = getDaysInMonth(year, month - 1);
  for (let i = firstDay - 1; i >= 0; i--) {
    calendarDays.push({
      day: prevMonthDays - i,
      isCurrentMonth: false,
      date: new Date(year, month - 1, prevMonthDays - i),
    });
  }

  // 현재 달 날짜
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push({
      day,
      isCurrentMonth: true,
      isToday: today.getFullYear() === year && today.getMonth() === month && today.getDate() === day,
      date: new Date(year, month, day),
    });
  }

  // 다음 달 날짜 (6주 채우기)
  const remaining = 42 - calendarDays.length;
  for (let day = 1; day <= remaining; day++) {
    calendarDays.push({
      day,
      isCurrentMonth: false,
      date: new Date(year, month + 1, day),
    });
  }

  // 특정 날짜의 일정 필터
  const getSchedulesForDate = (date) => {
    return schedules.filter((s) => {
      const start = new Date(s.start_time);
      return start.toDateString() === date.toDateString();
    });
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">일정 관리</h1>
        <button
          onClick={() => navigate("/schedule/new")}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={18} />
          일정 등록
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        {/* 캘린더 헤더 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-4">
            <button
              onClick={goToPrevMonth}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ChevronLeft size={20} />
            </button>
            <h2 className="text-xl font-semibold text-gray-900">
              {year}년 {month + 1}월
            </h2>
            <button
              onClick={goToNextMonth}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
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

        {/* 요일 */}
        <div className="grid grid-cols-7 border-b border-gray-100">
          {["일", "월", "화", "수", "목", "금", "토"].map((day, idx) => (
            <div
              key={day}
              className={`py-3 text-center text-sm font-medium ${
                idx === 0 ? "text-red-500" : idx === 6 ? "text-blue-500" : "text-gray-600"
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* 캘린더 그리드 */}
        <div className="grid grid-cols-7">
          {calendarDays.map((dayInfo, idx) => {
            const daySchedules = getSchedulesForDate(dayInfo.date);
            
            return (
              <div
                key={idx}
                onClick={() => {
                  if (dayInfo.isCurrentMonth) {
                    navigate(`/schedule/new?date=${dayInfo.date.toISOString().split('T')[0]}`);
                  }
                }}
                className={`min-h-[100px] p-2 border-b border-r border-gray-100 cursor-pointer hover:bg-gray-50 ${
                  !dayInfo.isCurrentMonth ? "bg-gray-50" : ""
                } ${dayInfo.isToday ? "bg-blue-50" : ""}`}
              >
                <div className={`text-sm mb-1 ${
                  !dayInfo.isCurrentMonth ? "text-gray-400" :
                  dayInfo.isToday ? "font-bold text-blue-600" :
                  idx % 7 === 0 ? "text-red-500" :
                  idx % 7 === 6 ? "text-blue-500" : "text-gray-700"
                }`}>
                  {dayInfo.day}
                </div>
                <div className="space-y-1">
                  {daySchedules.slice(0, 3).map((schedule) => (
                    <ScheduleItem
                      key={schedule.id}
                      schedule={schedule}
                      onClick={setSelectedSchedule}
                    />
                  ))}
                  {daySchedules.length > 3 && (
                    <div className="text-xs text-gray-400">
                      +{daySchedules.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 일정 상세 모달 */}
      {selectedSchedule && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-lg font-semibold">{selectedSchedule.title}</h2>
              <button
                onClick={() => setSelectedSchedule(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <Clock size={16} />
                {new Date(selectedSchedule.start_time).toLocaleString('ko-KR')}
              </div>
              {selectedSchedule.location && (
                <div className="flex items-center gap-2 text-gray-600">
                  <MapPin size={16} />
                  {selectedSchedule.room_name || selectedSchedule.location}
                </div>
              )}
              <div className="flex items-center gap-2 text-gray-600">
                <Users size={16} />
                {selectedSchedule.author_name}
                {selectedSchedule.attendee_count > 0 && ` 외 ${selectedSchedule.attendee_count}명`}
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setSelectedSchedule(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                닫기
              </button>
              <button
                onClick={() => navigate(`/schedule/${selectedSchedule.id}`)}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                상세 보기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
