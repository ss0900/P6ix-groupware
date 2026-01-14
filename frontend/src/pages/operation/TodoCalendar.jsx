// src/pages/operation/TodoCalendar.jsx
/**
 * TODO 캘린더 - 할 일 + 예상 마감일 통합
 */
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiChevronLeft,
  FiChevronRight,
  FiCheck,
  FiCalendar,
  FiTarget,
} from "react-icons/fi";
import { SalesService } from "../../api/operation";

function TodoCalendar() {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedEvents, setSelectedEvents] = useState([]);

  const fetchEvents = useCallback(async () => {
    setLoading(true);

    // 현재 월의 시작과 끝
    const start = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      1
    );
    const end = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      0
    );

    try {
      const data = await SalesService.getCalendar(
        start.toISOString(),
        end.toISOString()
      );
      setEvents(data);
    } catch (error) {
      console.error("Error fetching calendar:", error);
    } finally {
      setLoading(false);
    }
  }, [currentDate]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const days = [];

    // 이전 달의 빈 칸
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }

    // 현재 달의 날짜
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const getEventsForDate = (date) => {
    if (!date) return [];
    const dateStr = date.toISOString().split("T")[0];
    return events.filter((e) => {
      const eventDate = new Date(e.start).toISOString().split("T")[0];
      return eventDate === dateStr;
    });
  };

  const handleDateClick = (date) => {
    if (!date) return;
    setSelectedDate(date);
    setSelectedEvents(getEventsForDate(date));
  };

  const prevMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    );
  };

  const nextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    );
  };

  const today = new Date();
  const days = getDaysInMonth();
  const weekDays = ["일", "월", "화", "수", "목", "금", "토"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FiCalendar className="w-6 h-6 text-blue-600" />
          <h1 className="text-title">TODO 캘린더</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2 page-box">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={prevMonth}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <FiChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-semibold">
              {currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월
            </h2>
            <button
              onClick={nextMonth}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <FiChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Calendar Grid */}
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-7 gap-1 mb-2">
                {weekDays.map((day, i) => (
                  <div
                    key={day}
                    className={`text-center text-sm font-medium py-2 ${
                      i === 0
                        ? "text-red-500"
                        : i === 6
                        ? "text-blue-500"
                        : "text-gray-600"
                    }`}
                  >
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {days.map((date, index) => {
                  const dayEvents = getEventsForDate(date);
                  const isToday =
                    date && date.toDateString() === today.toDateString();
                  const isSelected =
                    date &&
                    selectedDate &&
                    date.toDateString() === selectedDate.toDateString();

                  return (
                    <div
                      key={index}
                      onClick={() => handleDateClick(date)}
                      className={`min-h-[80px] p-1 border rounded-lg cursor-pointer transition-colors ${
                        !date
                          ? "bg-gray-50"
                          : isSelected
                          ? "border-blue-500 bg-blue-50"
                          : isToday
                          ? "border-blue-300 bg-blue-50/50"
                          : "border-gray-100 hover:bg-gray-50"
                      }`}
                    >
                      {date && (
                        <>
                          <div
                            className={`text-sm font-medium mb-1 ${
                              isToday ? "text-blue-600" : "text-gray-700"
                            }`}
                          >
                            {date.getDate()}
                          </div>
                          <div className="space-y-0.5">
                            {dayEvents.slice(0, 3).map((event) => (
                              <div
                                key={event.id}
                                className="text-xs px-1 py-0.5 rounded truncate"
                                style={{
                                  backgroundColor: event.color + "20",
                                  color: event.color,
                                }}
                              >
                                {event.is_completed && (
                                  <FiCheck className="inline w-3 h-3 mr-0.5" />
                                )}
                                {event.title}
                              </div>
                            ))}
                            {dayEvents.length > 3 && (
                              <div className="text-xs text-gray-400 px-1">
                                +{dayEvents.length - 3}개 더
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Selected Date Detail */}
        <div className="page-box">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">
            {selectedDate
              ? `${
                  selectedDate.getMonth() + 1
                }월 ${selectedDate.getDate()}일 일정`
              : "날짜를 선택하세요"}
          </h3>

          {selectedDate ? (
            selectedEvents.length === 0 ? (
              <p className="text-center text-gray-500 py-8">일정이 없습니다.</p>
            ) : (
              <div className="space-y-3">
                {selectedEvents.map((event) => (
                  <div
                    key={event.id}
                    onClick={() =>
                      navigate(`/operation/sales/leads/${event.lead_id}`)
                    }
                    className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      {event.event_type === "task" ? (
                        <FiCheck
                          className={`w-4 h-4 mt-0.5 ${
                            event.is_completed
                              ? "text-green-500"
                              : "text-gray-400"
                          }`}
                        />
                      ) : (
                        <FiTarget className="w-4 h-4 mt-0.5 text-orange-500" />
                      )}
                      <div className="flex-1">
                        <p
                          className={`text-sm font-medium ${
                            event.is_completed
                              ? "line-through text-gray-400"
                              : "text-gray-900"
                          }`}
                        >
                          {event.title}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {event.lead_title}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            <p className="text-center text-gray-400 py-8">
              캘린더에서 날짜를 클릭하면
              <br />
              해당 일정이 표시됩니다.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default TodoCalendar;
