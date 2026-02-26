import React, { useEffect, useMemo, useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { format } from "date-fns";

/* =========================
   1) 캘린더용 CSS
   ========================= */
const CAL_STYLE_ID = "pmis-calendar-style-singlefile";
const CAL_CSS = `
/* 모든 오버라이드는 .pmis-calendar 스코프 안에서만 적용 → 전역 누수 방지 */
.pmis-calendar {
  width: 100%;
  border: none;
  background: white;
}
.pmis-calendar .react-calendar__navigation { margin-bottom: 8px; }
.pmis-calendar .react-calendar__month-view__weekdays__weekday { padding: 8px 0; text-align: center; }
.pmis-calendar abbr[title] { text-decoration: none; }

/* 타일 레이아웃 */
.pmis-calendar .react-calendar__tile {
  height: 80px;
  padding: 6px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  font-size: 14px;
  gap: 2px; /* 내부 요소 간격 고정 → 흔들림 완화 */
}

/* 타일 내부 컨테이너: 라벨 등장/증가에도 숫자가 덜 움직이게 */
.pmis-calendar .pmis-calendar__tile-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 28px; /* “총 N건”, 공휴일 라벨로 인한 점프 완화 */
}

/* 회의 개수 라벨 */
.pmis-calendar .meeting-calendar__count {
  margin-top: 4px;
  font-size: 11px;
  line-height: 1.4;
  color: #4b5563; /* gray-600으로 부드럽게 */
  font-weight: 500;
}

/* 날짜 셀 항목 리스트 */
.pmis-calendar .pmis-tile-items {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  width: 100%;
  margin-top: 3px;
  padding: 0 4px;
  text-align: left;
}
.pmis-calendar .pmis-tile-item {
  display: grid;
  grid-template-columns: 10px minmax(0, 1fr);
  align-items: start;
  column-gap: 4px;
  width: 100%;
  font-size: 11px;
  line-height: 1.35;
  color: #111827;
  text-align: left !important;
}
.pmis-calendar .pmis-tile-item.is-clickable { cursor: pointer; border-radius: 4px; }
.pmis-calendar .pmis-tile-item.is-clickable:hover { background: rgba(59, 130, 246, 0.12); }
.pmis-calendar .pmis-tile-item .bullet {
  display: inline-block;
  width: 10px;
  font-size: 7px;
  color: #6b7280;
  line-height: 1.35;
  text-align: center;
}
.pmis-calendar .pmis-tile-item .pmis-tile-item__label {
  display: block;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: left !important;
}
.pmis-calendar .pmis-tile-more {
  padding-left: 11px;
  font-size: 10px;
  line-height: 1.2;
  color: #6b7280;
  text-align: left;
}

/* 공휴일 라벨 */
.pmis-calendar .holiday-label {
  margin-top: 2px;
  font-size: 11px;
  line-height: 1.4;
  color: #ef4444; /* red-500 */
  text-align: center;
  font-weight: 500;
}

/* 상단 년/월 내비게이션 라벨 줄바꿈 방지 25.12.08 */
.pmis-calendar .react-calendar__navigation__label {
  white-space: nowrap;
  font-family: inherit; /* 상속 */
}

/* 기본 주말 색상 리셋 후 재정의 */
.pmis-calendar .react-calendar__month-view__days__day--weekend {
  color: inherit;
  font-weight: normal;
}
.pmis-calendar .is-sunday,
.pmis-calendar .is-sunday * { color: #ef4444; }
.pmis-calendar .is-saturday,
.pmis-calendar .is-saturday * { color: #3b82f6; }

/* 이웃달(저번달/다음달) 주말은 연한 색 */
.pmis-calendar .react-calendar__month-view__days__day--neighboringMonth.is-sunday,
.pmis-calendar .react-calendar__month-view__days__day--neighboringMonth.is-sunday * {
  color: #fca5a5 !important;
}
.pmis-calendar .react-calendar__month-view__days__day--neighboringMonth.is-saturday,
.pmis-calendar .react-calendar__month-view__days__day--neighboringMonth.is-saturday * {
  color: #bfdbfe !important;
}

/* 공휴일 강조 */
.pmis-calendar .is-holiday,
.pmis-calendar .is-holiday * {
  color: #ef4444 !important;
  font-weight: 600;
}

/* 이웃달(저번달/다음달) + 공휴일: 굵은 연한 빨강 */
.pmis-calendar .react-calendar__month-view__days__day--neighboringMonth.is-holiday,
.pmis-calendar .react-calendar__month-view__days__day--neighboringMonth.is-holiday * {
  color: #fca5a5 !important; /* 연한 빨강 */
  font-weight: 700;          /* 굵게 */
}

/* 오늘: 기본 노란 배경 제거 + 파란 테두리(선택 아님) */
.pmis-calendar .react-calendar__tile--now:not(.react-calendar__tile--active) {
  background: transparent !important;
  border: 1.5px solid #3b82f6; /* 두께 약간 축소, blue-500 */
  border-radius: 8px;
}
.pmis-calendar .react-calendar__tile--now:enabled:hover:not(.react-calendar__tile--active),
.pmis-calendar .react-calendar__tile--now:enabled:focus:not(.react-calendar__tile--active) {
  background: rgba(59, 130, 246, 0.05);
}

/* 선택: 파란 배경으로 꽉 채우기 */
.pmis-calendar .react-calendar__tile--active {
  background: #2563eb !important; /* blue-600 */
  color: #fff !important; /* 글씨 흰색 */
  border: none;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.25); /* 그림자 부드럽게 */
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.pmis-calendar .react-calendar__tile--active:enabled:hover,
.pmis-calendar .react-calendar__tile--active:enabled:focus {
  background: #1d4ed8 !important; /* blue-700 */
}

/* 선택 상태에서는 주말/공휴일 규칙보다 흰 글자 우선 */
.pmis-calendar .react-calendar__tile--active.is-holiday,
.pmis-calendar .react-calendar__tile--active.is-sunday,
.pmis-calendar .react-calendar__tile--active.is-saturday,
.pmis-calendar .react-calendar__tile--active.is-holiday *,
.pmis-calendar .react-calendar__tile--active.is-sunday *,
.pmis-calendar .react-calendar__tile--active.is-saturday * {
  color: #fff !important;
}

/* 선택된 날의 “총 N건” 라벨도 흰색 */
.pmis-calendar .react-calendar__tile--active .meeting-calendar__count,
.pmis-calendar .react-calendar__tile--active:enabled:hover .meeting-calendar__count,
.pmis-calendar .react-calendar__tile--active:enabled:focus .meeting-calendar__count {
  color: #fff !important;
  font-weight: 400; /* 선택시 너무 두껍지 않게 */
}
.pmis-calendar .react-calendar__tile--active .pmis-tile-item,
.pmis-calendar .react-calendar__tile--active .pmis-tile-item .pmis-tile-item__label,
.pmis-calendar .react-calendar__tile--active .pmis-tile-more {
  color: #fff !important;
}
.pmis-calendar .react-calendar__tile--active .pmis-tile-item .bullet {
  color: #fff !important;
}
.pmis-calendar .react-calendar__tile--active .pmis-tile-item.is-clickable:hover {
  background: rgba(255, 255, 255, 0.22);
}

/* ✅ 상태 도트(● N건) 줄 */
.pmis-calendar .pmis-status-row {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;          
  margin-top: 3px;   
  width: 100%;
  padding: 0 4px;    
}

/* ✅ 개별 도트 행 기본 스타일 */
.pmis-calendar .pmis-dot {
  display: flex;
  align-items: center;
  gap: 4px;          
  font-size: 11px;   
  padding: 1px 4px;    
  line-height: 1.3;  
  border-radius: 4px;
  width: 100%;
  white-space: nowrap;
  transition: all 0.2s ease-in-out;
}

/* ✅ 도트 기호 */
.pmis-calendar .pmis-dot .bullet {
  font-size: 8px; /* 도트 크기 약간 축소 */
  transform: translateY(0);
}

/* ✅ 색상별 bullet */
.pmis-calendar .bullet--green { color: #22c55e; }
.pmis-calendar .bullet--yellow { color: #eab308; } /* yellow-500 좀 더 진하게 */
.pmis-calendar .bullet--red { color: #ef4444; }
.pmis-calendar .bullet--gray { color: #9ca3af; }

/* ✅ 색상별 배경 (기본) - 투명도 0.5 -> 0.1로 아주 연하게 (가독성 위해) */
/* 사용자가 기존 스타일 유지를 원했으니 배경색 유지하되 좀 더 세련되게 */
.pmis-calendar .pmis-dot[data-color="green"] {
  background: rgba(34, 197, 94, 0.1);
  color: #15803d; /* 텍스트 진하게 */
}
.pmis-calendar .pmis-dot[data-color="yellow"] {
  background: rgba(234, 179, 8, 0.1);
  color: #a16207;
}
.pmis-calendar .pmis-dot[data-color="red"] {
  background: rgba(239, 68, 68, 0.1);
  color: #b91c1c;
}
.pmis-calendar .pmis-dot[data-color="gray"] {
  background: rgba(156, 163, 175, 0.1);
  color: #4b5563;
}

/* ✅ 선택된 날짜일 때: 색상 유지 + 투명도 0.9 + 흰 글씨 */
.pmis-calendar .react-calendar__tile--active .pmis-dot[data-color="green"] {
  background: rgba(34, 197, 94, 0.9) !important;
  color: #fff !important;
}
.pmis-calendar .react-calendar__tile--active .pmis-dot[data-color="yellow"] {
  background: rgba(250, 204, 21, 0.9) !important;
  color: #fff !important;
}
.pmis-calendar .react-calendar__tile--active .pmis-dot[data-color="red"] {
  background: rgba(239, 68, 68, 0.9);
  color: #fff;
}
.pmis-calendar .react-calendar__tile--active .pmis-dot[data-color="gray"] {
  background: rgba(156, 163, 175, 0.9);
  color: #fff;
}

/* 모바일(가로 768px 이하) 가독성 · 터치 영역 개선 25.12.08 */
@media (max-width: 768px) {
  .pmis-calendar {
    font-size: 15px; 
  }

  /* 상단 내비게이션 레이아웃: 중앙 정렬 */
  .pmis-calendar .react-calendar__navigation {
    margin-bottom: 8px; /* 간격 축소 */
    display: flex;
    justify-content: center; 
    align-items: center;
    gap: 0px; 
  }

  /* 내비 버튼 크기 균형 */
  .pmis-calendar .react-calendar__navigation button {
    font-size: 18px; /* 화살표 좀 더 크게 */
    font-weight: 500;
    flex: 0 0 auto;
    min-width: 40px; 
    color: #374151; /* gray-700 */
  }
  
  .pmis-calendar .react-calendar__navigation button:enabled:hover,
  .pmis-calendar .react-calendar__navigation button:enabled:focus {
    background-color: transparent; /* 호버 배경 제거 */
  }

  /* 2025년 12월 라벨: 중앙 고정 */
  .pmis-calendar .react-calendar__navigation__label {
    flex: 0 0 auto !important; /* width fit content */
    padding: 0 8px;
    text-align: center;
    white-space: nowrap;
    font-size: 18px;
    font-weight: 700;
    color: #111827; /* gray-900 */
  }

  .pmis-calendar .react-calendar__month-view__weekdays__weekday {
    padding: 8px 0;
    font-size: 13px;
    color: #6b7280; /* gray-500 */
    text-transform: none; /* 대문자 강제 해제 */
    font-weight: 500;
  }
  .pmis-calendar .react-calendar__month-view__weekdays__weekday abbr {
    text-decoration: none;
    cursor: default;
  }

  .pmis-calendar .react-calendar__tile {
    height: auto;     /* 높이 자동 */
    min-height: 64px; /* 최소 높이 설정 */
    font-size: 15px;
    padding: 6px 0;
    border-radius: 6px; /* 타일 모서리 살짝 둥글게 */
  }

  /* 공휴일 라벨: 1줄 제한 + ellipsis */
  .pmis-calendar .holiday-label {
    max-width: 90%;
    margin-top: 1px;
    font-size: 10px;
    line-height: 1.2;
    color: #ef4444;
    opacity: 0.9;
  }
  .pmis-calendar .holiday-label div {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* 회의 건수 라벨: 1줄 */
  .pmis-calendar .meeting-calendar__count {
    font-size: 11px;
    line-height: 1.2;
    margin-top: 1px;
    color: #6b7280; /* gray-500 */
    font-weight: 500;
  }
  .pmis-calendar .pmis-tile-item {
    font-size: 10px;
    line-height: 1.2;
  }
  .pmis-calendar .pmis-tile-more {
    font-size: 10px;
  }
  
  /* 선택된 날의 라벨 */
  .pmis-calendar .react-calendar__tile--active .meeting-calendar__count {
     color: #fff !important;
     opacity: 0.9;
  }

  /* 상태 도트 행: 더 작게 */
  .pmis-calendar .pmis-status-row {
    gap: 0px;
    margin-top: 2px;
  }
  .pmis-calendar .pmis-dot {
    font-size: 10px;
    padding: 1px 4px;
    line-height: 1.2;
  }
  .pmis-calendar .pmis-dot .bullet {
    font-size: 8px;
  }
}
`;
(function injectOnce() {
  if (typeof document === "undefined") return;
  if (document.getElementById(CAL_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = CAL_STYLE_ID;
  style.textContent = CAL_CSS;
  document.head.appendChild(style);
})();

/* =========================
   2) 유틸: 회의 개수 집계
   ========================= */
export function buildCounts(items = [], getDate = (x) => x?.schedule) {
  const out = {};
  for (const it of items) {
    const raw = getDate(it);
    const ymd =
      typeof raw === "string"
        ? raw.slice(0, 10)
        : raw instanceof Date
          ? format(raw, "yyyy-MM-dd")
          : "";
    if (!ymd) continue;
    out[ymd] = (out[ymd] || 0) + 1;
  }
  return out; // Record<'yyyy-MM-dd', number>
}

/** 상태별 카운트: { 'YYYY-MM-DD': { green, yellow, red, total } } */
export function buildStatusCounts(
  items = [],
  getDate = (x) => x?.date,
  getColor = () => "yellow"
) {
  const out = {};
  for (const it of items) {
    const raw = getDate(it);
    const ymd =
      typeof raw === "string"
        ? raw.slice(0, 10)
        : raw instanceof Date
          ? format(raw, "yyyy-MM-dd")
          : "";
    if (!ymd) continue;

    const c = String(getColor(it) || "yellow").toLowerCase();
    const bucket = (out[ymd] ||= {
      blue: 0,
      green: 0,
      yellow: 0,
      red: 0,
      gray: 0,
      total: 0,
    });

    if (c === "blue") bucket.blue += 1;
    else if (c === "green") bucket.green += 1;
    else if (c === "red") bucket.red += 1;
    else if (c === "gray") bucket.gray += 1;
    else bucket.yellow += 1; // 기본값

    bucket.total += 1;
  }
  return out;
}

/* =========================
   3) (선택) KR 공휴일 로더
   - Nager.Date 우선, 실패 시 date-holidays 폴백
   - Map → Record로 반환
   ========================= */
const HOLI_CACHE_KEY = (y) => `kr_holidays_${y}`;
const HOLI_TTL = 1000 * 60 * 60 * 24 * 7; // 7d
function normalizeHolidayName(name) {
  const m = {
    기독탄신일: "크리스마스",
    성탄절: "크리스마스",
    "Christmas Day": "크리스마스",
  };
  return m[name] ?? name;
}
const toYMD = (s) =>
  s?.slice ? s.slice(0, 10) : s ? format(new Date(s), "yyyy-MM-dd") : "";

function loadHolidayCache(y) {
  try {
    const raw = localStorage.getItem(HOLI_CACHE_KEY(y));
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts > HOLI_TTL) return null;
    return new Map(data);
  } catch {
    return null;
  }
}
function saveHolidayCache(y, map) {
  try {
    localStorage.setItem(
      HOLI_CACHE_KEY(y),
      JSON.stringify({ ts: Date.now(), data: [...map.entries()] })
    );
  } catch { }
}

export async function getKRHolidayMap(year, { forceRefresh = false } = {}) {
  if (!forceRefresh) {
    const c = loadHolidayCache(year);
    if (c) return Object.fromEntries(c.entries());
  }
  // 1) Nager.Date
  try {
    const r = await fetch(
      `https://date.nager.at/api/v3/PublicHolidays/${year}/KR`
    );
    if (r.ok) {
      const arr = await r.json();
      const map = new Map();
      for (const h of arr) {
        const types = h.types || [];
        if (!types.includes("Public")) continue;
        const ymd = toYMD(h.date);
        const isSub =
          /substitute/i.test(h.name) || /대체공휴일/.test(h.localName || "");
        const nm =
          normalizeHolidayName(h.localName || h.name) +
          (isSub ? " (대체공휴일)" : "");
        const prev = map.get(ymd) || [];
        if (!prev.includes(nm)) map.set(ymd, [...prev, nm]);
      }
      if (map.size) {
        saveHolidayCache(year, map);
        return Object.fromEntries(map.entries());
      }
    }
  } catch { }
  // 2) 폴백: date-holidays
  try {
    const mod = await import("date-holidays");
    const Holidays = mod.default || mod;
    const hd = new Holidays("KR", { languages: "ko" });
    const map = new Map();
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const res = hd.isHoliday(day);
      if (!res) continue;
      const items = (Array.isArray(res) ? res : [res])
        .filter((r) => r.type === "public")
        .map(
          (r) =>
            normalizeHolidayName(r.name) + (r.substitute ? " (대체공휴일)" : "")
        );
      if (items.length) map.set(format(day, "yyyy-MM-dd"), items);
    }
    saveHolidayCache(year, map);
    return Object.fromEntries(map.entries());
  } catch {
    return {};
  }
}

/* =========================
   4) 재사용 캘린더 컴포넌트
   - countsByDate / holidayMap은 Record<'yyyy-MM-dd', ...>
   ========================= */

export default function ReusableCalendar({
  value,
  onChange,
  countsByDate = {},
  tileItemsByDate = {},
  onMonthChange,
  className = "",
  locale = "ko-KR",
  showCounts = true,
  showTileItems = false,
  maxTileItems = 3,
  getTileItemLabel = (item) => item?.title || "",
  onTileItemClick,
  formatDayLabel,
  showHolidayLabels = true,
  holidayMap: holidayMapProp,
  statusCountsByDate = {},
}) {
  // --- 선택 날짜: 컨트롤드/언컨트롤드 겸용 ---
  const [internalDate, setInternalDate] = useState(() => new Date());
  const selected = value ?? internalDate;
  const handleChange = (next) => {
    if (onChange) onChange(next); // 컨트롤드
    else setInternalDate(next); // 언컨트롤드
  };

  // --- 활성 연도: 선택 날짜/월 이동에 맞춰 내부에서 관리 ---
  const [activeYear, setActiveYear] = useState(() => selected.getFullYear());
  useEffect(() => {
    setActiveYear(selected.getFullYear());
  }, [selected]);

  // --- 공휴일: 외부 제공 없으면 내부 로딩 ---
  const [holidayMapState, setHolidayMapState] = useState({});
  useEffect(() => {
    if (holidayMapProp) return; // 외부 제공 시 로딩 스킵
    (async () => setHolidayMapState(await getKRHolidayMap(activeYear)))();
  }, [activeYear, holidayMapProp]);

  const meetingCounts = useMemo(
    () => new Map(Object.entries(countsByDate)),
    [countsByDate]
  );
  const tileItems = useMemo(
    () => new Map(Object.entries(tileItemsByDate || {})),
    [tileItemsByDate]
  );
  const statusCounts = useMemo(
    () => new Map(Object.entries(statusCountsByDate || {})),
    [statusCountsByDate]
  );
  const holidays = useMemo(
    () => new Map(Object.entries(holidayMapProp ?? holidayMapState)),
    [holidayMapProp, holidayMapState]
  );

  return (
    <Calendar
      className={`pmis-calendar ${className}`}
      value={selected}
      onChange={handleChange}
      locale={locale}
      formatShortWeekday={(l, d) =>
        ["일", "월", "화", "수", "목", "금", "토"][d.getDay()]
      }
      formatDay={(l, d) => {
        const base = String(d.getDate());
        if (!formatDayLabel) return base;
        const key = format(d, "yyyy-MM-dd");
        const holidayLabels = holidays.get(key) || [];
        return formatDayLabel(d, base, holidayLabels);
      }}
      formatMonthYear={(l, d) => format(d, "yyyy년 M월")}
      formatMonth={(l, d) => `${d.getMonth() + 1}월`}
      formatYear={(l, d) => format(d, "yyyy년")}
      onActiveStartDateChange={({ activeStartDate, view }) => {
        if (view === "month") {
          const y = activeStartDate.getFullYear();
          if (y !== activeYear) setActiveYear(y); // 내부 연도 갱신
          onMonthChange?.(activeStartDate); // 필요시 부모 알림
        }
      }}
      tileClassName={({ date, view }) => {
        if (view !== "month") return undefined;
        const key = format(date, "yyyy-MM-dd");
        const cls = [];
        if (holidays.has(key)) cls.push("is-holiday");
        const dow = date.getDay();
        if (dow === 0) cls.push("is-sunday");
        if (dow === 6) cls.push("is-saturday");
        return cls.join(" ");
      }}
      tileContent={({ date, view }) => {
        if (view !== "month") return null;
        const key = format(date, "yyyy-MM-dd");
        const stat = statusCounts.get(key); // { blue, green, yellow, red, gray, total }
        const labels = holidays.get(key);
        const dayItems = tileItems.get(key) || [];
        return (
          <div className="pmis-calendar__tile-inner">
            {showTileItems && Array.isArray(dayItems) && dayItems.length > 0 ? (
              <div className="pmis-tile-items">
                {dayItems.slice(0, maxTileItems).map((item, idx) => {
                  const label = String(
                    getTileItemLabel(item) || item?.title || "(제목 없음)"
                  ).trim();
                  const isClickable = typeof onTileItemClick === "function";
                  return (
                    <div
                      key={item?.id || `${key}-item-${idx}`}
                      className={`pmis-tile-item${isClickable ? " is-clickable" : ""}`}
                      title={label}
                      onMouseDown={(e) => {
                        if (!isClickable) return;
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onClick={(e) => {
                        if (!isClickable) return;
                        e.preventDefault();
                        e.stopPropagation();
                        onTileItemClick(item, date);
                      }}
                    >
                      <span className="bullet">●</span>
                      <span className="pmis-tile-item__label">{label}</span>
                    </div>
                  );
                })}
                {dayItems.length > maxTileItems && (
                  <div className="pmis-tile-more">
                    +{dayItems.length - maxTileItems}
                  </div>
                )}
              </div>
            ) : (
              showCounts &&
              (() => {
                const s = stat || {};
                const hasAny =
                  (s.green || 0) > 0 ||
                  (s.yellow || 0) > 0 ||
                  (s.red || 0) > 0 ||
                  (s.gray || 0) > 0;

                if (hasAny) {
                  return (
                    <div className="pmis-status-row">
                      {(() => {
                        // 고정 순서 + 라벨 매핑 (기존 의미 그대로)
                        const ORDER = [
                          "blue",
                          "green",
                          "yellow",
                          "red",
                          "gray",
                        ];
                        const LABEL = {
                          blue: "예정",
                          green: "적합(완료)",
                          yellow: "조치 필요·진행 중",
                          red: "부적합·긴급",
                          gray: "임시 저장·취소",
                        };

                        return ORDER.map((key) => {
                          const cnt = Number(s?.[key] || 0);
                          if (cnt <= 0) return null;
                          return (
                            <span
                              key={key}
                              className="pmis-dot"
                              title={`${LABEL[key]} ${cnt}건`}
                              aria-label={`${LABEL[key]} ${cnt}건`}
                            >
                              <span className={`bullet bullet--${key}`}>●</span>
                              {cnt}건
                            </span>
                          );
                        });
                      })()}
                    </div>
                  );
                }

                // 상태 집계가 없으면 기존 "총 N건" 라벨로 대체
                const fallback = meetingCounts.get(key) || 0;
                return fallback > 0 ? (
                  <div
                    className="meeting-calendar__count"
                    title={`총 ${fallback}건`}
                  >
                    총 {fallback}건
                  </div>
                ) : null;
              })()
            )}

            {showHolidayLabels &&
              Array.isArray(labels) &&
              labels.length > 0 && (
                <div className="holiday-label" title={labels.join(", ")}>
                  {labels.map((txt, i) => (
                    <div key={i}>{txt}</div>
                  ))}
                </div>
              )}
          </div>
        );
      }}
    />
  );
}
