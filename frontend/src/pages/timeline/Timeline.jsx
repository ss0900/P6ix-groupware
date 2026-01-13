// src/pages/timeline/Timeline.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import api from "../../api/axios";
import {
  Search,
  Star,
  MoreVertical,
  FileCheck,
  MessageSquare,
  Calendar,
  ClipboardList,
  Megaphone,
  Clock,
  ClipboardCheck,
  Settings,
  Inbox
} from "lucide-react";
import "./Timeline.css";

// 활동 유형 설정
const ACTIVITY_TYPES = [
  { value: "approval", label: "결재", icon: FileCheck, color: "bg-blue-500" },
  { value: "board", label: "게시판", icon: MessageSquare, color: "bg-green-500" },
  { value: "schedule", label: "일정", icon: Calendar, color: "bg-orange-500" },
  { value: "task", label: "업무", icon: ClipboardList, color: "bg-purple-500" },
  { value: "announcement", label: "공지", icon: Megaphone, color: "bg-red-500" },
  { value: "attendance", label: "근태/출결", icon: Clock, color: "bg-indigo-500" },
  { value: "survey", label: "설문조사", icon: ClipboardCheck, color: "bg-pink-500" },
];

// 기간 옵션
const PERIOD_OPTIONS = [
  { value: "", label: "전체" },
  { value: "week", label: "기간 적용" },
];

function Timeline() {
  const { user } = useAuth();
  
  // 상태
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState(
    ACTIVITY_TYPES.reduce((acc, type) => ({ ...acc, [type.value]: true }), {})
  );
  const [period, setPeriod] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  // 이벤트 로드
  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      // 활성화된 필터만 추출
      const activeTypes = Object.entries(filters)
        .filter(([_, active]) => active)
        .map(([type]) => type);

      const params = new URLSearchParams();
      if (activeTypes.length > 0 && activeTypes.length < ACTIVITY_TYPES.length) {
        params.set("activity_type", activeTypes.join(","));
      }
      if (searchQuery) {
        params.set("search", searchQuery);
      }
      if (period) {
        params.set("period", period);
      }
      if (favoritesOnly) {
        params.set("favorites_only", "true");
      }

      const response = await api.get(`timeline/events/?${params.toString()}`);
      setEvents(response.data?.results ?? response.data ?? []);
    } catch (err) {
      console.error("Failed to load timeline events:", err);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [filters, searchQuery, period, favoritesOnly]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // 필터 토글
  const toggleFilter = (type) => {
    setFilters((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  // 즐겨찾기 토글
  const toggleFavorite = async (eventId) => {
    try {
      const response = await api.post(`timeline/events/${eventId}/toggle_favorite/`);
      // 로컬 상태 업데이트
      setEvents((prev) =>
        prev.map((event) =>
          event.id === eventId
            ? { ...event, is_favorited: response.data.is_favorited }
            : event
        )
      );
    } catch (err) {
      console.error("Failed to toggle favorite:", err);
    }
  };

  // 날짜별 그룹화
  const groupEventsByDate = (events) => {
    const groups = {};
    events.forEach((event) => {
      const date = new Date(event.created_at).toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).replace(/\. /g, "-").replace(".", "");
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(event);
    });
    return groups;
  };

  // 시간 포맷
  const formatTime = (dateTimeStr) => {
    if (!dateTimeStr) return "";
    const date = new Date(dateTimeStr);
    return date.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  // 이니셜 추출
  const getInitial = (name) => {
    if (!name) return "?";
    return name.charAt(0).toUpperCase();
  };

  const groupedEvents = groupEventsByDate(events);

  return (
    <div className="timeline-container">
      {/* 좌측 사이드바 */}
      <aside className="timeline-sidebar">
        <div className="timeline-sidebar-card">
          {/* 프로필 섹션 */}
          <div className="timeline-profile">
            {user?.profile_picture ? (
              <img
                src={user.profile_picture}
                alt="Profile"
                className="timeline-profile-image"
              />
            ) : (
              <div className="timeline-profile-placeholder">
                {getInitial(user?.last_name || user?.username)}
              </div>
            )}
            <div className="timeline-profile-name">
              {user?.last_name}{user?.first_name || user?.username}
            </div>
            <div className="timeline-profile-position">
              {user?.position || "사원"}
            </div>
          </div>

          {/* 검색 섹션 */}
          <div className="timeline-search-section">
            <div className="timeline-search-wrapper">
              <Search size={16} className="timeline-search-icon" />
              <input
                type="text"
                placeholder="작성 검색"
                className="timeline-search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* 필터 토글 */}
          <div className="timeline-filters">
            {ACTIVITY_TYPES.map((type) => {
              const Icon = type.icon;
              return (
                <div key={type.value} className="timeline-filter-item">
                  <div className="timeline-filter-label">
                    <span className={`timeline-filter-icon ${type.color} text-white rounded p-0.5`}>
                      <Icon size={14} />
                    </span>
                    <span>{type.label}</span>
                  </div>
                  <button
                    className={`timeline-toggle ${filters[type.value] ? "active" : ""}`}
                    onClick={() => toggleFilter(type.value)}
                  />
                </div>
              );
            })}
          </div>

          {/* 기간 필터 */}
          <div className="timeline-period-filter">
            <div className="timeline-period-options">
              {PERIOD_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  className={`timeline-period-btn ${period === opt.value ? "active" : ""}`}
                  onClick={() => setPeriod(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 환경설정 */}
          <div className="timeline-settings">
            <span className="timeline-settings-link">
              <Settings size={16} />
              환경설정
            </span>
          </div>
        </div>
      </aside>

      {/* 메인 피드 */}
      <main className="timeline-feed">
        {/* 헤더 */}
        <div className="timeline-feed-header">
          <h1 className="timeline-feed-title">타임라인</h1>
          <button
            className={`timeline-favorite-toggle ${favoritesOnly ? "active" : ""}`}
            onClick={() => setFavoritesOnly(!favoritesOnly)}
          >
            <Star size={16} fill={favoritesOnly ? "currentColor" : "none"} />
            즐겨찾기 보기
          </button>
        </div>

        {/* 컨텐츠 */}
        {loading ? (
          <div className="timeline-loading">
            <div className="timeline-spinner" />
          </div>
        ) : Object.keys(groupedEvents).length === 0 ? (
          <div className="timeline-empty">
            <Inbox size={64} className="timeline-empty-icon" />
            <p className="timeline-empty-text">표시할 타임라인이 없습니다.</p>
          </div>
        ) : (
          Object.entries(groupedEvents).map(([date, dateEvents]) => (
            <div key={date} className="timeline-date-group">
              <div className="timeline-date-badge">{date}</div>
              {dateEvents.map((event) => (
                <div key={event.id} className="timeline-event-card">
                  {/* 아바타 */}
                  <div className="timeline-event-avatar">
                    {event.author_profile_picture ? (
                      <img src={event.author_profile_picture} alt={event.author_name} />
                    ) : (
                      <div className="timeline-event-avatar-placeholder">
                        {getInitial(event.author_name)}
                      </div>
                    )}
                  </div>

                  {/* 내용 */}
                  <div className="timeline-event-content">
                    <div className="timeline-event-header">
                      <div>
                        <div className="timeline-event-title-row">
                          <span className={`timeline-event-type-badge ${event.activity_type}`}>
                            {event.activity_type_display}
                          </span>
                          <span className="timeline-event-author">{event.author_name}</span>
                          {event.author_position && (
                            <span className="timeline-event-position">{event.author_position}</span>
                          )}
                        </div>
                        <div className="timeline-event-time">{formatTime(event.created_at)}</div>
                      </div>
                      <div className="timeline-event-actions">
                        <button
                          className={`timeline-event-action-btn ${event.is_favorited ? "favorited" : ""}`}
                          onClick={() => toggleFavorite(event.id)}
                          title="즐겨찾기"
                        >
                          <Star size={18} fill={event.is_favorited ? "currentColor" : "none"} />
                        </button>
                        <button className="timeline-event-action-btn" title="더보기">
                          <MoreVertical size={18} />
                        </button>
                      </div>
                    </div>
                    <div className="timeline-event-body">{event.content || event.title}</div>
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </main>
    </div>
  );
}

export default Timeline;
