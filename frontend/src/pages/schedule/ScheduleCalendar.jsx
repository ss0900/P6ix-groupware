// src/pages/schedule/ScheduleCalendar.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { Plus, Printer, Search, X } from "lucide-react";
import { scheduleApi, calendarApi } from "../../api/schedule";
import api from "../../api/axios";
import PageHeader from "../../components/common/ui/PageHeader";
import Calendar, {
  buildCounts,
  getKRHolidayMap,
} from "../../components/common/feature/Calendar";
import ScheduleForm from "./ScheduleForm";
import ScheduleDetail from "./ScheduleDetail";

const EVENT_TYPE_STYLES = {
  general: { bg: "bg-gray-100", text: "text-gray-700", label: "일반" },
  annual: { bg: "bg-yellow-100", text: "text-yellow-800", label: "연차" },
  monthly: { bg: "bg-orange-100", text: "text-orange-700", label: "월차" },
  half: { bg: "bg-blue-100", text: "text-blue-700", label: "반차" },
  meeting: { bg: "bg-purple-100", text: "text-purple-700", label: "회의" },
  trip: { bg: "bg-green-100", text: "text-green-700", label: "출장" },
};

const SCOPE_TITLES = {
  all: "전체 일정",
  shared: "공유 일정",
  personal: "개인 일정",
};

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

  const countsByDate = useMemo(
    () => buildCounts(schedules, (s) => s.start),
    [schedules]
  );

  const selectedDaySchedules = useMemo(() => {
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    return schedules
      .filter((s) => {
        const startDate = (s.start || "").slice(0, 10);
        const endDate = (s.end || s.start || "").slice(0, 10);
        return startDate <= dateStr && endDate >= dateStr;
      })
      .sort((a, b) => String(a.start || "").localeCompare(String(b.start || "")));
  }, [schedules, selectedDate]);

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

  const defaultScope = scope === "personal" ? "personal" : "company";

  return (
    <div className="flex-1 flex flex-col bg-white h-full">
      <div className="px-4 py-3 border-b border-gray-200">
        <PageHeader
          className="mb-0"
          title={(
            <span className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <span className="text-gray-400">≡</span>
              {pageTitle}
            </span>
          )}
        >
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
          <div className="flex gap-6 items-start">
            <div className="w-[550px] border rounded-xl bg-white shadow-sm p-4">
              <div className="flex justify-center">
                <Calendar
                  value={selectedDate}
                  onChange={setSelectedDate}
                  countsByDate={countsByDate}
                  holidayMap={holidayMap}
                  onMonthChange={(d) => setCurrentDate(d)}
                  showCounts={true}
                />
              </div>
            </div>

            <div className="flex-1 border rounded-xl bg-white shadow-sm p-4 max-h-[80vh] overflow-y-auto">
              <h3 className="text-base font-semibold mb-4">
                {format(selectedDate, "yyyy-MM-dd")} 일정
              </h3>

              {selectedDaySchedules.length === 0 ? (
                <p className="text-sm text-gray-400">일정이 없습니다.</p>
              ) : (
                <div className="space-y-2">
                  {selectedDaySchedules.map((item) => {
                    const typeStyle = EVENT_TYPE_STYLES[item.event_type] || EVENT_TYPE_STYLES.general;
                    const time = item.is_all_day ? "종일" : format(new Date(item.start), "HH:mm");
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => openView(item)}
                        className="w-full text-left border border-gray-200 rounded-lg p-3 hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-gray-800">{item.title}</span>
                          {item.event_type && item.event_type !== "general" && (
                            <span className={`px-2 py-0.5 rounded-full text-xs ${typeStyle.bg} ${typeStyle.text}`}>
                              {typeStyle.label}
                            </span>
                          )}
                          {item.is_urgent && (
                            <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700">
                              긴급
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {time}
                          {item.owner_name ? ` · ${item.owner_name}` : ""}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

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
