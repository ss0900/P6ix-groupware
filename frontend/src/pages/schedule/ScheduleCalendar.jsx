// src/pages/schedule/ScheduleCalendar.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { Plus, Printer, Search, X } from "lucide-react";
import { scheduleApi, calendarApi } from "../../api/schedule";
import api from "../../api/axios";
import PageHeader from "../../components/common/ui/PageHeader";
import Calendar, {
  getKRHolidayMap,
} from "../../components/common/feature/Calendar";
import ScheduleForm from "./ScheduleForm";
import ScheduleDetail from "./ScheduleDetail";

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
  height: 108px;
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

  const [companyId, setCompanyId] = useState(null);

  const [panelOpen, setPanelOpen] = useState(false);
  const [panelMode, setPanelMode] = useState(null);
  const [activeItem, setActiveItem] = useState(null);

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
      const start = format(startOfMonth(currentDate), "yyyy-MM-dd");
      const end = format(endOfMonth(currentDate), "yyyy-MM-dd");

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
  }, [currentDate, searchQuery, scope, calendarId]);

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

  const goToToday = () => {
    const today = new Date();
    setSelectedDate(today);
    setCurrentDate(today);
  };

  const goToThisWeek = () => {
    const today = new Date();
    setSelectedDate(today);
    setCurrentDate(today);
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
    setPanelOpen(false);
    setPanelMode(null);
    setActiveItem(null);
  };

  const defaultScope = scope === "personal" ? "personal" : "company";
  const panelWidthClass = panelMode === "create" ? "max-w-[1000px]" : "max-w-md";

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
            <div className="w-full">
              <Calendar
                className="schedule-calendar-grid-lines w-full"
                value={selectedDate}
                onChange={setSelectedDate}
                tileItemsByDate={tileItemsByDate}
                showTileItems={true}
                maxTileItems={3}
                getTileItemLabel={(item) => {
                  const calendarPrefix = item?.calendar_name
                    ? `[${item.calendar_name}] `
                    : "";
                  const title = item?.title || "(제목 없음)";
                  return `${calendarPrefix}${title}`;
                }}
                onTileItemClick={(item) => openView(item)}
                formatDayLabel={(date, dayLabel, holidayLabels = []) => {
                  if (!Array.isArray(holidayLabels) || holidayLabels.length === 0) {
                    return dayLabel;
                  }
                  const dayHolidayGap = String.fromCharCode(160).repeat(3);
                  return `${dayLabel}${dayHolidayGap}${holidayLabels[0]}`;
                }}
                holidayMap={holidayMap}
                onMonthChange={(d) => setCurrentDate(d)}
                showCounts={false}
                showHolidayLabels={false}
              />
            </div>
          </div>
        )}
      </div>

      {panelOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black bg-opacity-30"
            onClick={closePanel}
          />
          <div className={`relative w-full ${panelWidthClass} bg-white shadow-xl overflow-y-auto`}>
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
