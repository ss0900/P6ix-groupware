// src/pages/schedule/MeetingCalendar.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isSameDay, isToday } from "date-fns";
import { ko } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus, Clock, MapPin, Users, AlertCircle } from "lucide-react";
import { meetingApi, getMyUserIdFromToken } from "../../api/meeting";
import MeetingForm from "./MeetingForm";
import MeetingDetail from "./MeetingDetail";

// 장소 타입 라벨
const getLocationLabel = (locationType) => {
  switch (locationType) {
    case "online": return "온라인";
    case "offline_room": return "오프라인(회의실)";
    case "offline_address": return "오프라인(주소)";
    default: return "오프라인";
  }
};

export default function MeetingCalendar() {
  const myUserId = useMemo(() => Number(getMyUserIdFromToken() || 0), []);
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // 패널 상태
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelMode, setPanelMode] = useState(null); // 'view' | 'create' | 'edit'
  const [activeItem, setActiveItem] = useState(null);
  
  // RSVP 모달
  const [rsvpOpen, setRsvpOpen] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // 회의 데이터 로드
  const fetchMeetings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await meetingApi.list();
      const data = res.data?.results ?? res.data ?? [];
      setMeetings(data);
    } catch (err) {
      console.error("회의 목록 조회 실패:", err);
      setMeetings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

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

    // 첫 주 시작 요일에 맞춰 빈칸 추가
    const startDay = getDay(start);
    const paddedDays = [];
    for (let i = 0; i < startDay; i++) {
      paddedDays.push(null);
    }

    return [...paddedDays, ...days];
  }, [currentDate]);

  // 날짜별 회의 필터
  const getMeetingsForDate = useCallback((date) => {
    if (!date) return [];
    const dateStr = format(date, "yyyy-MM-dd");
    return meetings.filter((m) => (m.schedule || "").slice(0, 10) === dateStr);
  }, [meetings]);

  // 날짜별 회의 개수
  const countsByDate = useMemo(() => {
    const counts = {};
    meetings.forEach((m) => {
      const dateStr = (m.schedule || "").slice(0, 10);
      counts[dateStr] = (counts[dateStr] || 0) + 1;
    });
    return counts;
  }, [meetings]);

  // 선택된 날짜의 회의 목록
  const selectedDateMeetings = useMemo(() => {
    const list = getMeetingsForDate(selectedDate);
    // 긴급 회의 먼저, 그 다음 시간순
    return list.sort((a, b) => {
      if (a.is_urgent !== b.is_urgent) return b.is_urgent ? 1 : -1;
      return String(a.schedule || "").localeCompare(String(b.schedule || ""));
    });
  }, [selectedDate, getMeetingsForDate]);

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
    
    // 내가 참석 대상이면서 미응답이면 RSVP 모달 표시
    const myParticipant = (item?.participants || []).find(
      (p) => Number(p.user_id) === myUserId
    );
    if (item?.is_required_for_me && myParticipant && !myParticipant.responded) {
      setRsvpOpen(true);
    } else {
      setRsvpOpen(false);
    }
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
    setRsvpOpen(false);
  };

  // RSVP 처리
  const handleRsvp = async (isAttending) => {
    if (!activeItem) return;
    try {
      await meetingApi.rsvp(activeItem.id, isAttending);
      await fetchMeetings();
      setRsvpOpen(false);
    } catch (err) {
      console.error("RSVP 실패:", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">회의 캘린더</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={18} />
          회의 등록
        </button>
      </div>

      <div className="flex gap-6 items-start">
        {/* 좌측: 캘린더 */}
        <div className="w-[550px] bg-white rounded-xl border border-gray-200 p-4">
          {/* 캘린더 헤더 */}
          <div className="flex items-center justify-between mb-4">
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
              const count = countsByDate[dateStr] || 0;
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
                  {count > 0 && (
                    <div className="mt-1 flex justify-center">
                      <span className="text-xs bg-blue-500 text-white px-1.5 py-0.5 rounded-full">
                        {count}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 우측: 회의 목록 */}
        <div className="flex-1 bg-white rounded-xl border border-gray-200 p-4 max-h-[600px] overflow-y-auto">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {format(selectedDate, "yyyy년 M월 d일", { locale: ko })} 회의 목록
          </h3>

          {loading ? (
            <p className="text-gray-500">로딩 중...</p>
          ) : selectedDateMeetings.length === 0 ? (
            <p className="text-gray-400">회의가 없습니다.</p>
          ) : (
            <div className="space-y-3">
              {selectedDateMeetings.map((meeting) => (
                <div
                  key={meeting.id}
                  onClick={() => openView(meeting)}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Clock size={16} className="text-gray-400" />
                      <span className="text-sm text-gray-600">
                        {format(new Date(meeting.schedule), "HH:mm")}
                      </span>
                    </div>
                    {meeting.is_urgent && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-700 text-xs rounded-full border border-red-200">
                        <AlertCircle size={12} />
                        긴급
                      </span>
                    )}
                  </div>
                  <h4 className="font-medium text-gray-900 mt-2">{meeting.title}</h4>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <MapPin size={14} />
                      {getLocationLabel(meeting.location_type)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users size={14} />
                      {meeting.participant_count || 0}명
                    </span>
                  </div>
                  {meeting.is_required_for_me && (
                    <span className="inline-block mt-2 px-2 py-0.5 bg-green-50 text-green-700 text-xs rounded-full">
                      참석 대상
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 사이드 패널 */}
      {panelOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black bg-opacity-30" onClick={closePanel} />
          <div className="relative w-full max-w-2xl bg-white shadow-xl overflow-y-auto">
            <div className="p-6">
              {panelMode === "create" && (
                <MeetingForm
                  mode="create"
                  initialDate={selectedDate}
                  onSaved={(created) => {
                    fetchMeetings();
                    openView(created);
                  }}
                  onClose={closePanel}
                />
              )}
              {panelMode === "view" && activeItem && (
                <MeetingDetail
                  item={activeItem}
                  myUserId={myUserId}
                  onEdit={() => openEdit(activeItem)}
                  onDeleted={() => {
                    fetchMeetings();
                    closePanel();
                  }}
                  onClose={closePanel}
                />
              )}
              {panelMode === "edit" && activeItem && (
                <MeetingForm
                  mode="edit"
                  initial={activeItem}
                  onSaved={() => {
                    fetchMeetings();
                    closePanel();
                  }}
                  onClose={closePanel}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* RSVP 모달 */}
      {rsvpOpen && activeItem && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setRsvpOpen(false)} />
          <div className="relative bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
            <h4 className="text-lg font-semibold mb-2">이 회의에 참석하시겠습니까?</h4>
            <p className="text-sm text-gray-600 mb-5">
              {activeItem.title} · {activeItem.schedule?.slice(0, 16)?.replace("T", " ")}
            </p>
            <div className="flex gap-2 justify-end">
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                onClick={() => handleRsvp(true)}
              >
                네
              </button>
              <button
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                onClick={() => setRsvpOpen(false)}
              >
                나중에 답할게요
              </button>
              <button
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                onClick={() => handleRsvp(false)}
              >
                아니오
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
