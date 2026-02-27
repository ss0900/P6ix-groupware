// src/pages/schedule/ScheduleCalendar.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addWeeks,
} from "date-fns";
import { Plus, Printer, Search, X } from "lucide-react";
import {
  scheduleApi,
  calendarApi,
  getMyUserIdFromToken,
} from "../../api/schedule";
import api from "../../api/axios";
import PageHeader from "../../components/common/ui/PageHeader";
import Calendar, {
  getKRHolidayMap,
} from "../../components/common/feature/Calendar";
import ScheduleForm from "./ScheduleForm";

const SCOPE_TITLES = {
  all: "전체 일정",
  shared: "공유 일정",
  personal: "개인 일정",
};

const CATEGORY_TITLES = {
  headquarters: "본사일정",
};

const CALENDAR_DAY_DIVIDER_CSS = `
.schedule-calendar-shell {
  background-color: #ffffff;
}

.pmis-calendar.schedule-calendar-grid-lines {
  background-color: #ffffff !important;
}

.pmis-calendar.schedule-calendar-grid-lines .react-calendar__month-view__days {
  border-top: 1px solid #e5e7eb;
  border-left: 1px solid #e5e7eb;
}

.pmis-calendar.schedule-calendar-grid-lines .react-calendar__month-view__weekdays {
  border-top: 1px solid #e5e7eb;
  border-left: 1px solid #e5e7eb;
}

.pmis-calendar.schedule-calendar-grid-lines .react-calendar__month-view__weekdays__weekday {
  border-right: 1px solid #e5e7eb;
  border-bottom: 1px solid #e5e7eb;
  box-sizing: border-box;
}

.pmis-calendar.schedule-calendar-grid-lines .react-calendar__month-view__weekdays__weekday abbr {
  font-size: 0;
  position: relative;
  display: inline-block;
}

.pmis-calendar.schedule-calendar-grid-lines .react-calendar__month-view__weekdays__weekday abbr::after {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
}

.pmis-calendar.schedule-calendar-grid-lines .react-calendar__month-view__weekdays__weekday:nth-child(1) abbr::after {
  content: "일";
  color: #ef4444;
}

.pmis-calendar.schedule-calendar-grid-lines .react-calendar__month-view__weekdays__weekday:nth-child(2) abbr::after { content: "월"; }
.pmis-calendar.schedule-calendar-grid-lines .react-calendar__month-view__weekdays__weekday:nth-child(3) abbr::after { content: "화"; }
.pmis-calendar.schedule-calendar-grid-lines .react-calendar__month-view__weekdays__weekday:nth-child(4) abbr::after { content: "수"; }
.pmis-calendar.schedule-calendar-grid-lines .react-calendar__month-view__weekdays__weekday:nth-child(5) abbr::after { content: "목"; }
.pmis-calendar.schedule-calendar-grid-lines .react-calendar__month-view__weekdays__weekday:nth-child(6) abbr::after { content: "금"; }

.pmis-calendar.schedule-calendar-grid-lines .react-calendar__month-view__weekdays__weekday:nth-child(7) abbr::after {
  content: "토";
  color: #3b82f6;
}

.pmis-calendar.schedule-calendar-grid-lines .react-calendar__month-view__days__day {
  border-right: 1px solid #e5e7eb !important;
  border-bottom: 1px solid #e5e7eb !important;
  box-sizing: border-box;
}

.pmis-calendar.schedule-calendar-grid-lines .react-calendar__month-view__days__day.react-calendar__tile--active,
.pmis-calendar.schedule-calendar-grid-lines .react-calendar__month-view__days__day.react-calendar__tile--now {
  border-right: 1px solid #e5e7eb !important;
  border-bottom: 1px solid #e5e7eb !important;
}

.pmis-calendar.schedule-calendar-grid-lines .react-calendar__month-view__days__day.react-calendar__tile--now:not(.react-calendar__tile--active) {
  border: 1.5px solid #3b82f6 !important;
  position: relative;
  z-index: 2;
}

.pmis-calendar.schedule-calendar-grid-lines .react-calendar__navigation {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 6px;
  width: fit-content;
  margin: 0 auto 8px;
}

.pmis-calendar.schedule-calendar-grid-lines .react-calendar__navigation__arrow {
  flex: 0 0 auto !important;
  min-width: 28px;
  width: 28px;
  padding: 0;
}

.pmis-calendar.schedule-calendar-grid-lines .react-calendar__navigation__label {
  flex-grow: 0 !important;
  flex-shrink: 0 !important;
  flex-basis: auto !important;
  min-width: max-content !important;
  width: auto !important;
  margin: 0 12px;
  padding: 0 6px;
  text-align: center;
}

.pmis-calendar.schedule-calendar-grid-lines .react-calendar__tile {
  height: 130px;
  align-items: stretch;
  padding: 4px 2px;
}

.pmis-calendar.schedule-calendar-grid-lines .react-calendar__tile abbr {
  display: block;
  width: calc(100% - 30px);
  padding-left: 4px;
  text-align: left;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pmis-calendar.schedule-calendar-grid-lines .pmis-calendar__tile-inner {
  width: 100%;
  align-items: flex-start;
  min-height: 0;
}

.pmis-calendar.schedule-week-calendar-view .react-calendar__navigation {
  display: none !important;
}

.pmis-calendar.schedule-week-calendar-view .react-calendar__month-view__days__day.is-outside-week {
  display: none;
}

.pmis-calendar.schedule-week-calendar-view .react-calendar__tile {
  min-height: 180px;
  height: 180px;
}

.pmis-calendar.schedule-week-calendar {
  background-color: #ffffff !important;
}

.pmis-calendar.schedule-week-calendar .react-calendar__navigation {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 6px;
  width: fit-content;
  margin: 0 auto 8px;
}

.pmis-calendar.schedule-week-calendar .react-calendar__navigation__arrow {
  flex: 0 0 auto !important;
  min-width: 28px;
  width: 28px;
  padding: 0;
}

.pmis-calendar.schedule-week-calendar .react-calendar__navigation__label {
  flex-grow: 0 !important;
  flex-shrink: 0 !important;
  flex-basis: auto !important;
  min-width: max-content !important;
  width: auto !important;
  margin: 0 12px;
  padding: 0 6px;
  text-align: center;
}

.pmis-calendar.schedule-week-calendar .schedule-week-board {
  border-radius: 8px;
  overflow: hidden;
}

.pmis-calendar.schedule-week-calendar .schedule-week-weekdays {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  border-top: 1px solid #e5e7eb;
  border-left: 1px solid #e5e7eb;
}

.pmis-calendar.schedule-week-calendar .schedule-week-weekday {
  padding: 8px 0;
  text-align: center;
  border-right: 1px solid #e5e7eb;
  border-bottom: 1px solid #e5e7eb;
  box-sizing: border-box;
  font-size: 14px;
  font-weight: 600;
}

.pmis-calendar.schedule-week-calendar .schedule-week-weekday.is-sunday,
.pmis-calendar.schedule-week-calendar .schedule-week-weekday.is-sunday * {
  color: #ef4444;
}

.pmis-calendar.schedule-week-calendar .schedule-week-weekday.is-saturday,
.pmis-calendar.schedule-week-calendar .schedule-week-weekday.is-saturday * {
  color: #3b82f6;
}

.pmis-calendar.schedule-week-calendar .schedule-week-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  border-left: 1px solid #e5e7eb;
}

.pmis-calendar.schedule-week-calendar .schedule-week-cell {
  min-height: 180px;
  border-right: 1px solid #e5e7eb;
  border-bottom: 1px solid #e5e7eb;
  box-sizing: border-box;
  padding: 4px 2px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.pmis-calendar.schedule-week-calendar .schedule-week-cell:hover:not(.is-selected) {
  background-color: #e6e6e6;
}

.pmis-calendar.schedule-week-calendar .schedule-week-cell.is-today:not(.is-selected):hover {
  background: rgba(59, 130, 246, 0.05);
}

.pmis-calendar.schedule-week-calendar .schedule-week-cell.is-today:not(.is-selected) {
  background: transparent !important;
  border: 1.5px solid #3b82f6;
  border-radius: 8px;
  position: relative;
  z-index: 2;
}

.pmis-calendar.schedule-week-calendar .schedule-week-cell.is-selected {
  background: #2563eb;
  color: #ffffff;
  border-color: transparent;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.25);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.pmis-calendar.schedule-week-calendar .schedule-week-cell.is-selected:hover {
  background: #1d4ed8;
}

.pmis-calendar.schedule-week-calendar .schedule-week-cell.is-selected .schedule-week-day-button,
.pmis-calendar.schedule-week-calendar .schedule-week-cell.is-selected .schedule-week-day-button.is-sunday,
.pmis-calendar.schedule-week-calendar .schedule-week-cell.is-selected .schedule-week-day-button.is-saturday,
.pmis-calendar.schedule-week-calendar .schedule-week-cell.is-selected .schedule-week-day-button.is-neighboring-month,
.pmis-calendar.schedule-week-calendar .schedule-week-cell.is-selected .schedule-week-day-button.is-neighboring-month.is-sunday,
.pmis-calendar.schedule-week-calendar .schedule-week-cell.is-selected .schedule-week-day-button.is-neighboring-month.is-saturday,
.pmis-calendar.schedule-week-calendar .schedule-week-cell.is-selected .schedule-week-day-button.is-selected {
  color: #ffffff !important;
}

.pmis-calendar.schedule-week-calendar .schedule-week-cell.is-selected .pmis-tile-item {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.45);
}

.pmis-calendar.schedule-week-calendar .schedule-week-cell.is-selected .pmis-tile-item,
.pmis-calendar.schedule-week-calendar .schedule-week-cell.is-selected .pmis-tile-item .pmis-tile-item__label {
  color: #ffffff !important;
}

.pmis-calendar.schedule-week-calendar .schedule-week-cell.is-selected .pmis-tile-item.is-clickable:hover {
  background: rgba(255, 255, 255, 0.3);
}

.pmis-calendar.schedule-week-calendar .schedule-week-cell.is-selected .schedule-week-overflow-count {
  color: #ffffff;
  border-color: rgba(255, 255, 255, 0.45);
  background: rgba(255, 255, 255, 0.16);
}

.pmis-calendar.schedule-week-calendar .schedule-week-day-button {
  display: block;
  width: calc(100% - 30px);
  padding-left: 4px;
  text-align: left;
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pmis-calendar.schedule-week-calendar .schedule-week-day-button.is-sunday,
.pmis-calendar.schedule-week-calendar .schedule-week-day-button.is-sunday * {
  color: #ef4444;
}

.pmis-calendar.schedule-week-calendar .schedule-week-day-button.is-saturday,
.pmis-calendar.schedule-week-calendar .schedule-week-day-button.is-saturday * {
  color: #3b82f6;
}

.pmis-calendar.schedule-week-calendar .schedule-week-day-button.is-neighboring-month {
  color: #9ca3af;
}

.pmis-calendar.schedule-week-calendar .schedule-week-day-button.is-neighboring-month.is-sunday,
.pmis-calendar.schedule-week-calendar .schedule-week-day-button.is-neighboring-month.is-sunday * {
  color: #fca5a5;
}

.pmis-calendar.schedule-week-calendar .schedule-week-day-button.is-neighboring-month.is-saturday,
.pmis-calendar.schedule-week-calendar .schedule-week-day-button.is-neighboring-month.is-saturday * {
  color: #bfdbfe;
}

.pmis-calendar.schedule-week-calendar .schedule-week-day-button.is-selected {
  color: #1d4ed8;
}

.pmis-calendar.schedule-week-calendar .schedule-week-overflow-count {
  margin-top: 3px;
  margin-left: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 16px;
  padding: 0 6px;
  border-radius: 999px;
  border: 1px solid #cbd5e1;
  background: #f8fafc;
  font-size: 10px;
  line-height: 1;
  font-weight: 600;
  color: #475569;
}
`;

export default function ScheduleCalendar({ scope, category }) {
  const { calendarId } = useParams();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [calendarInfo, setCalendarInfo] = useState(null);

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRangeMode, setDateRangeMode] = useState("month");

  const [companyId, setCompanyId] = useState(null);

  const [panelOpen, setPanelOpen] = useState(false);
  const [panelMode, setPanelMode] = useState(null);
  const [activeItem, setActiveItem] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [holidayMap, setHolidayMap] = useState({});

  const pageTitle = useMemo(() => {
    if (scope) return SCOPE_TITLES[scope] || "일정";
    if (category) return CATEGORY_TITLES[category] || "카테고리 일정";
    if (calendarId && calendarInfo) return calendarInfo.name;
    return "일정";
  }, [scope, category, calendarId, calendarInfo]);

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

  useEffect(() => {
    (async () => {
      try {
        setHolidayMap(await getKRHolidayMap(currentDate.getFullYear()));
      } catch (err) {
        console.error("공휴일 로드 실패:", err);
        setHolidayMap({});
      }
    })();
  }, [currentDate]);

  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    try {
      const start = format(
        dateRangeMode === "thisWeek"
          ? startOfWeek(currentDate, { weekStartsOn: 0 })
          : startOfMonth(currentDate),
        "yyyy-MM-dd",
      );
      const end = format(
        dateRangeMode === "thisWeek"
          ? endOfWeek(currentDate, { weekStartsOn: 0 })
          : endOfMonth(currentDate),
        "yyyy-MM-dd",
      );

      const params = {
        date_from: start,
        date_to: end,
        search: searchQuery || undefined,
      };

      if (scope === "personal") {
        params.scope = "personal";
      } else if (scope === "shared") {
        params.scope = "company";
      }

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
  }, [currentDate, dateRangeMode, searchQuery, scope, calendarId]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const tileItemsByDate = useMemo(() => {
    const grouped = {};
    for (const item of schedules) {
      if (!item?.start) continue;
      const ymd = String(item.start).slice(0, 10);
      if (!grouped[ymd]) grouped[ymd] = [];
      grouped[ymd].push(item);
    }

    Object.values(grouped).forEach((items) => {
      items.sort((a, b) => {
        const aTime = a?.start ? new Date(a.start).getTime() : 0;
        const bTime = b?.start ? new Date(b.start).getTime() : 0;
        return aTime - bTime;
      });
    });

    return grouped;
  }, [schedules]);

  const weekStartDate = useMemo(
    () => startOfWeek(currentDate, { weekStartsOn: 0 }),
    [currentDate],
  );
  const weekEndDate = useMemo(
    () => endOfWeek(currentDate, { weekStartsOn: 0 }),
    [currentDate],
  );
  const weekDates = useMemo(
    () => eachDayOfInterval({ start: weekStartDate, end: weekEndDate }),
    [weekStartDate, weekEndDate],
  );
  const weekDateSet = useMemo(
    () => new Set(weekDates.map((date) => format(date, "yyyy-MM-dd"))),
    [weekDates],
  );

  const getScheduleLabel = useCallback((item) => {
    const calendarPrefix = item?.calendar_name
      ? `[${item.calendar_name}] `
      : "";
    const startDate = item?.start ? new Date(item.start) : null;
    const timePrefix =
      startDate &&
      !Number.isNaN(startDate.getTime()) &&
      item?.is_all_day !== true
        ? `${format(startDate, "HH:mm")} `
        : "";
    const title = item?.title || "(제목 없음)";
    return `${timePrefix}${calendarPrefix}${title}`;
  }, []);

  const goToToday = () => {
    const today = new Date();
    setDateRangeMode("month");
    setSelectedDate(today);
    setCurrentDate(today);
  };

  const goToThisWeek = () => {
    const today = new Date();
    setDateRangeMode("thisWeek");
    setSelectedDate(today);
    setCurrentDate(today);
  };

  const goToMonthCalendar = () => {
    setDateRangeMode("month");
  };

  const openCreate = (date) => {
    setSelectedDate(date || new Date());
    setActiveItem(null);
    setPanelMode("create");
    setPanelOpen(true);
  };

  const openEdit = (item) => {
    setActiveItem(item);
    setPanelMode("edit");
    setPanelOpen(true);
  };

  const openView = (item) => {
    if (!item) return;
    setActiveItem(item);
    setPanelMode("view");
    setPanelOpen(true);
  };

  const closePanel = () => {
    setDeleting(false);
    setPanelOpen(false);
    setPanelMode(null);
    setActiveItem(null);
  };

  const handleDeleteFromView = async () => {
    if (!canManageActiveItem) return;
    if (!activeItem?.id) return;
    if (!window.confirm("정말 이 일정을 삭제하시겠습니까?")) return;
    setDeleting(true);
    try {
      await scheduleApi.remove(activeItem.id);
      await fetchSchedules();
      closePanel();
    } catch (err) {
      console.error("삭제 실패:", err);
      alert("삭제에 실패했습니다.");
      setDeleting(false);
    }
  };

  const defaultScope = scope === "personal" ? "personal" : "company";
  const panelWidthClass = "max-w-md";
  const myUserId = getMyUserIdFromToken();

  const canManageActiveItem = useMemo(() => {
    if (!activeItem || myUserId == null) return false;

    const ownerCandidates = [
      activeItem.owner,
      activeItem.owner_id,
      activeItem.created_by,
      activeItem.created_by_id,
      activeItem.user,
      activeItem.user_id,
      activeItem.owner?.id,
      activeItem.created_by?.id,
      activeItem.user?.id,
    ];

    return ownerCandidates.some(
      (ownerId) => ownerId != null && String(ownerId) === String(myUserId),
    );
  }, [activeItem, myUserId]);

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-200">
        <PageHeader className="mb-0" title={pageTitle}>
          <div className="flex items-center gap-2">
            <button
              onClick={() => openCreate(selectedDate)}
              className="flex items-center gap-2 px-3 py-1.5 bg-sky-500 text-white rounded hover:bg-sky-600"
            >
              <Plus size={16} />
              일정 추가
            </button>
            <button
              onClick={
                dateRangeMode === "thisWeek" ? goToMonthCalendar : goToThisWeek
              }
              className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50"
            >
              {dateRangeMode === "thisWeek" ? "전체일정" : "금주일정"}
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
          </div>
        </PageHeader>

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

      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="h-full flex items-center justify-center text-gray-500">
            일정을 불러오는 중입니다...
          </div>
        ) : (
          <div className="schedule-calendar-shell w-full border rounded-xl bg-white p-6">
            <style>{CALENDAR_DAY_DIVIDER_CSS}</style>
            {dateRangeMode === "thisWeek" ? (
              <div className="pmis-calendar schedule-week-calendar w-full">
                <div className="react-calendar__navigation">
                  <button
                    type="button"
                    onClick={() => {
                      const nextDate = addWeeks(currentDate, -1);
                      setCurrentDate(nextDate);
                      setSelectedDate(nextDate);
                    }}
                    className="react-calendar__navigation__arrow"
                  >
                    ‹
                  </button>
                  <div className="react-calendar__navigation__label text-sm font-semibold text-gray-700">
                    {format(weekStartDate, "yyyy년 M월 d일")} ~{" "}
                    {format(weekEndDate, "M월 d일")}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const nextDate = addWeeks(currentDate, 1);
                      setCurrentDate(nextDate);
                      setSelectedDate(nextDate);
                    }}
                    className="react-calendar__navigation__arrow"
                  >
                    ›
                  </button>
                </div>

                <Calendar
                  className="schedule-calendar-grid-lines schedule-week-calendar-view w-full"
                  calendarType="gregory"
                  value={selectedDate}
                  activeStartDate={startOfMonth(currentDate)}
                  onChange={setSelectedDate}
                  tileItemsByDate={tileItemsByDate}
                  showTileItems={true}
                  maxTileItems={4}
                  getTileItemLabel={getScheduleLabel}
                  onTileItemClick={(item) => openView(item)}
                  getTileClassName={({ date, view }) => {
                    if (view !== "month") return "";
                    const ymd = format(date, "yyyy-MM-dd");
                    return weekDateSet.has(ymd)
                      ? "is-current-week"
                      : "is-outside-week";
                  }}
                  holidayMap={holidayMap}
                  showCounts={false}
                  showHolidayLabels={false}
                />
              </div>
            ) : (
              <div className="w-full">
                <Calendar
                  className="schedule-calendar-grid-lines w-full"
                  calendarType="gregory"
                  value={selectedDate}
                  activeStartDate={startOfMonth(currentDate)}
                  onChange={setSelectedDate}
                  tileItemsByDate={tileItemsByDate}
                  showTileItems={true}
                  maxTileItems={4}
                  getTileItemLabel={getScheduleLabel}
                  onTileItemClick={(item) => openView(item)}
                  formatDayLabel={(date, dayLabel, holidayLabels = []) => {
                    if (
                      !Array.isArray(holidayLabels) ||
                      holidayLabels.length === 0
                    ) {
                      return dayLabel;
                    }
                    const dayHolidayGap = String.fromCharCode(160).repeat(3);
                    return `${dayLabel}${dayHolidayGap}${holidayLabels[0]}`;
                  }}
                  holidayMap={holidayMap}
                  onMonthChange={(d) => {
                    setDateRangeMode("month");
                    setCurrentDate(d);
                  }}
                  showCounts={false}
                  showHolidayLabels={false}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {panelOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black bg-opacity-30"
            onClick={closePanel}
          />
          <div
            className={`relative w-full ${panelWidthClass} bg-white shadow-xl overflow-y-auto`}
          >
            <div className="p-6">
              {panelMode === "create" && (
                <ScheduleForm
                  mode="create"
                  initialDate={selectedDate}
                  companyId={companyId}
                  defaultScope={defaultScope}
                  preferredCalendarId={
                    calendarId && calendarId !== "custom" ? calendarId : null
                  }
                  onSaved={() => {
                    fetchSchedules();
                    closePanel();
                  }}
                  onClose={closePanel}
                />
              )}
              {panelMode === "view" && activeItem && (
                <ScheduleForm
                  mode="view"
                  initial={activeItem}
                  companyId={companyId}
                  onClose={closePanel}
                  onEdit={
                    canManageActiveItem ? () => openEdit(activeItem) : undefined
                  }
                  onDelete={
                    canManageActiveItem ? handleDeleteFromView : undefined
                  }
                  deleting={deleting}
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
