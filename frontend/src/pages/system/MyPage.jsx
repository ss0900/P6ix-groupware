import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { format, addMonths, subMonths, addYears, subYears, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isSameMonth } from "date-fns";
import api from "../../api/axios";
import { scheduleApi } from "../../api/schedule";
import ContactApi from "../../api/ContactApi";

const weekdayLabels = ["일", "월", "화", "수", "목", "금", "토"];

const parseDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const formatDateTime = (value) => {
  const date = parseDate(value);
  if (!date) return "-";
  return format(date, "yyyy-MM-dd HH:mm");
};

const formatScheduleTime = (item) => {
  if (item?.is_all_day) return "종일";
  const start = parseDate(item?.start);
  const end = parseDate(item?.end);
  if (!start) return "-";
  if (!end) return format(start, "HH:mm");

  const startText = format(start, "HH:mm");
  const endText = format(end, "HH:mm");
  return startText === endText ? startText : `${startText}~${endText}`;
};

export default function MyPage() {
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [approvalStats, setApprovalStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
  });
  const [monthSchedules, setMonthSchedules] = useState([]);
  const [receivedMessages, setReceivedMessages] = useState([]);

  const loadMyPageData = useCallback(async () => {
    setLoading(true);
    try {
      const dateFrom = format(startOfMonth(currentMonth), "yyyy-MM-dd");
      const dateTo = format(endOfMonth(currentMonth), "yyyy-MM-dd");

      const [approvalRes, schedulesRes, receivedRes] = await Promise.allSettled([
        api.get("approval/documents/stats/"),
        scheduleApi.list({
          scope: "personal",
          date_from: dateFrom,
          date_to: dateTo,
        }),
        ContactApi.getMessages({ folder: "received" }),
      ]);

      if (approvalRes.status === "fulfilled") {
        const stats = approvalRes.value.data || {};
        setApprovalStats({
          pending: Number(stats.my_pending || 0),
          approved: Number(stats.approved || 0),
          rejected: Number(stats.rejected || 0),
        });
      } else {
        setApprovalStats({ pending: 0, approved: 0, rejected: 0 });
      }

      if (schedulesRes.status === "fulfilled") {
        const list = schedulesRes.value.data?.results ?? schedulesRes.value.data ?? [];
        setMonthSchedules(Array.isArray(list) ? list : []);
      } else {
        setMonthSchedules([]);
      }

      if (receivedRes.status === "fulfilled") {
        const list = receivedRes.value?.results ?? receivedRes.value ?? [];
        setReceivedMessages((Array.isArray(list) ? list : []).slice(0, 5));
      } else {
        setReceivedMessages([]);
      }
    } catch (error) {
      console.error("Failed to load my page data:", error);
      setApprovalStats({ pending: 0, approved: 0, rejected: 0 });
      setMonthSchedules([]);
      setReceivedMessages([]);
    } finally {
      setLoading(false);
    }
  }, [currentMonth]);

  useEffect(() => {
    loadMyPageData();
  }, [loadMyPageData]);

  const calendarDays = useMemo(() => {
    const rangeStart = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 });
    const rangeEnd = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 });
    return eachDayOfInterval({ start: rangeStart, end: rangeEnd });
  }, [currentMonth]);

  const selectedDateSchedules = useMemo(() => {
    const target = selectedDate;
    return monthSchedules
      .filter((item) => {
        const start = parseDate(item.start);
        const end = parseDate(item.end || item.start);
        if (!start || !end) return false;

        const targetStart = new Date(target);
        targetStart.setHours(0, 0, 0, 0);
        const targetEnd = new Date(target);
        targetEnd.setHours(23, 59, 59, 999);

        return start <= targetEnd && end >= targetStart;
      })
      .sort((a, b) => {
        const aStart = parseDate(a.start)?.getTime() || 0;
        const bStart = parseDate(b.start)?.getTime() || 0;
        return aStart - bStart;
      });
  }, [monthSchedules, selectedDate]);

  const selectedDateLabel = useMemo(
    () => format(selectedDate, "yyyy-MM-dd"),
    [selectedDate],
  );

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <h1 className="text-4xl font-bold text-gray-900">My Page</h1>
      <div className="border-b border-gray-200" />

      <div className="grid grid-cols-1 xl:grid-cols-[1.6fr_1fr] gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-1 text-gray-700">
              <button
                type="button"
                onClick={() => setCurrentMonth((prev) => subYears(prev, 1))}
                className="p-1.5 rounded hover:bg-gray-100"
              >
                <ChevronsLeft size={16} />
              </button>
              <button
                type="button"
                onClick={() => setCurrentMonth((prev) => subMonths(prev, 1))}
                className="p-1.5 rounded hover:bg-gray-100"
              >
                <ChevronLeft size={16} />
              </button>
            </div>

            <h2 className="text-2xl font-semibold text-gray-900">
              {format(currentMonth, "yyyy년 M월")}
            </h2>

            <div className="flex items-center gap-1 text-gray-700">
              <button
                type="button"
                onClick={() => setCurrentMonth((prev) => addMonths(prev, 1))}
                className="p-1.5 rounded hover:bg-gray-100"
              >
                <ChevronRight size={16} />
              </button>
              <button
                type="button"
                onClick={() => setCurrentMonth((prev) => addYears(prev, 1))}
                className="p-1.5 rounded hover:bg-gray-100"
              >
                <ChevronsRight size={16} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 mb-2">
            {weekdayLabels.map((day, index) => (
              <div
                key={day}
                className={`text-center text-sm font-semibold ${
                  index === 0 ? "text-red-500" : index === 6 ? "text-blue-500" : "text-gray-700"
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-y-2">
            {calendarDays.map((day) => {
              const selected = isSameDay(day, selectedDate);
              const isCurrent = isSameMonth(day, currentMonth);
              const dayColor = !isCurrent
                ? "text-gray-300"
                : day.getDay() === 0
                ? "text-red-500"
                : day.getDay() === 6
                ? "text-blue-500"
                : "text-gray-800";

              return (
                <div key={day.toISOString()} className="h-16 flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => setSelectedDate(day)}
                    className={`w-11 h-11 rounded-xl text-base transition ${
                      selected
                        ? "bg-[#1e1e2f] text-white shadow-md"
                        : `${dayColor} hover:bg-gray-100`
                    }`}
                  >
                    {format(day, "d")}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 bg-[#1e1e2f] text-white font-semibold">
              결재 수신함
            </div>
            <div className="px-4 py-3">
              <div className="grid grid-cols-3 border border-gray-200 rounded-lg overflow-hidden">
                <div className="py-3 text-center bg-amber-50 border-r border-gray-200">
                  <p className="text-2xl font-semibold text-amber-600">{approvalStats.pending}</p>
                  <p className="text-sm text-gray-600">결재 대기</p>
                </div>
                <div className="py-3 text-center border-r border-gray-200">
                  <p className="text-2xl font-semibold text-green-600">{approvalStats.approved}</p>
                  <p className="text-sm text-gray-600">승인 완료</p>
                </div>
                <div className="py-3 text-center">
                  <p className="text-2xl font-semibold text-red-500">{approvalStats.rejected}</p>
                  <p className="text-sm text-gray-600">반려됨</p>
                </div>
              </div>
              <div className="mt-4 text-center text-sm text-gray-500">
                {approvalStats.pending > 0
                  ? `결재 대기 문서 ${approvalStats.pending}건이 있습니다.`
                  : "결재 대기 문서가 없습니다."}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 bg-[#1e1e2f] text-white font-semibold">
              내 업무(수신함)
            </div>
            <div className="px-4 py-3">
              {receivedMessages.length === 0 ? (
                <p className="text-sm text-gray-500">수신된 업무연락이 없습니다.</p>
              ) : (
                <div className="space-y-2">
                  {receivedMessages.map((msg) => (
                    <button
                      key={msg.id}
                      type="button"
                      onClick={() => navigate(`/contact/${msg.id}`)}
                      className="w-full text-left px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50"
                    >
                      <p className="text-sm font-medium text-gray-800 truncate">{msg.title}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDateTime(msg.created_at)}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold text-gray-900">
            {selectedDateLabel} 개인 일정
          </h2>
          <button
            type="button"
            onClick={() => navigate("/schedule/new")}
            className="px-5 py-2 border border-[#1e1e2f] text-[#1e1e2f] rounded-lg hover:bg-gray-50"
          >
            일정 등록
          </button>
        </div>

        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 text-sm text-gray-700">
              <tr>
                <th className="w-20 px-4 py-3 text-center border-b border-gray-200">번호</th>
                <th className="w-48 px-4 py-3 text-center border-b border-gray-200">시간</th>
                <th className="px-4 py-3 text-center border-b border-gray-200">제목</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-sm text-gray-500">
                    로딩 중입니다.
                  </td>
                </tr>
              ) : selectedDateSchedules.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-sm text-gray-500">
                    오늘은 일정이 없습니다.
                  </td>
                </tr>
              ) : (
                selectedDateSchedules.map((item, index) => (
                  <tr key={item.id} className="border-b border-gray-100 last:border-b-0">
                    <td className="px-4 py-3 text-center text-sm text-gray-700">{index + 1}</td>
                    <td className="px-4 py-3 text-center text-sm text-gray-700">
                      {formatScheduleTime(item)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-800">
                      <button
                        type="button"
                        onClick={() => navigate(`/schedule/${item.id}`)}
                        className="hover:underline text-left"
                      >
                        {item.title || "-"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
