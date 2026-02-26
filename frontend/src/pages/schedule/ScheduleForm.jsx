// src/pages/schedule/ScheduleForm.jsx
import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { AlertTriangle } from "lucide-react";
import { scheduleApi, calendarApi, resourceApi } from "../../api/schedule";
import api from "../../api/axios";
import PageHeader from "../../components/common/ui/PageHeader";

const EVENT_TYPES = [
  { value: "general", label: "일반" },
  { value: "annual", label: "연차" },
  { value: "monthly", label: "월차" },
  { value: "half", label: "반차" },
  { value: "meeting", label: "회의" },
  { value: "trip", label: "출장" },
];

const LOCATION_TYPES = [
  { value: "", label: "선택 안함" },
  { value: "online", label: "온라인" },
  { value: "offline_room", label: "오프라인(회의실)" },
  { value: "offline_address", label: "오프라인(주소)" },
];

export default function ScheduleForm({
  mode = "create",
  initial = null,
  initialDate = new Date(),
  companyId = null,
  defaultScope = "personal",
  onSaved,
  onClose,
}) {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [calendars, setCalendars] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [participantIds, setParticipantIds] = useState([]);
  const formId = "schedule-form";

  const [form, setForm] = useState({
    title: initial?.title || "",
    scope: initial?.scope || defaultScope,
    event_type: initial?.event_type || "general",
    location: initial?.location || "",
    date: initial?.start?.slice(0, 10) || format(initialDate, "yyyy-MM-dd"),
    time: initial?.start?.slice(11, 16) || "09:00",
    end_date: initial?.end?.slice(0, 10) || "",
    end_time: initial?.end?.slice(11, 16) || "",
    is_all_day: initial?.is_all_day || false,
    memo: initial?.memo || "",
    color: initial?.color || "#3B82F6",
    calendar: initial?.calendar || null,
    // 회의 전용 필드
    location_type: initial?.location_type || "",
    meet_url: initial?.meet_url || "",
    resource: initial?.resource || null,
    agenda: initial?.agenda || "",
    is_urgent: initial?.is_urgent || false,
  });

  const isMeeting = form.event_type === "meeting";

  // 사용자 목록 로드
  useEffect(() => {
    if (form.scope === "company" || isMeeting) {
      (async () => {
        try {
          const res = await api.get("/users/");
          setUsers(res.data?.results ?? res.data ?? []);
        } catch (err) {
          console.error("사용자 목록 로드 실패:", err);
        }
      })();
    } else {
      setUsers([]);
    }
  }, [form.scope, isMeeting]);

  // 캘린더 목록 로드
  useEffect(() => {
    (async () => {
      try {
        const res = await calendarApi.myCalendars();
        setCalendars(res.data ?? []);
      } catch (err) {
        console.error("캘린더 목록 로드 실패:", err);
      }
    })();
  }, []);

  // 회의실 목록 로드
  useEffect(() => {
    if (isMeeting && form.location_type === "offline_room") {
      (async () => {
        try {
          const res = await resourceApi.rooms();
          setRooms(res.data ?? []);
        } catch (err) {
          console.error("회의실 목록 로드 실패:", err);
        }
      })();
    } else {
      setRooms([]);
    }
  }, [isMeeting, form.location_type]);

  // 기존 참여자 설정 (수정 모드)
  useEffect(() => {
    if (initial?.participants) {
      setParticipantIds(initial.participants.map((p) => p.id));
    }
  }, [initial]);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const toggleParticipant = (userId) => {
    setParticipantIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return alert("제목을 입력해주세요.");
    if (!form.date) return alert("날짜를 선택해주세요.");

    setLoading(true);
    try {
      const start = new Date(
        `${form.date}T${form.time || "00:00"}:00`,
      ).toISOString();
      const end = form.end_date
        ? new Date(
            `${form.end_date}T${form.end_time || "23:59"}:00`,
          ).toISOString()
        : null;

      const payload = {
        title: form.title,
        scope: form.scope,
        event_type: form.event_type,
        location: form.location,
        start,
        end,
        is_all_day: form.is_all_day,
        memo: form.memo,
        color: form.color,
        calendar: form.calendar || null,
        company: form.scope === "company" && companyId ? companyId : null,
        participant_ids:
          form.scope === "company" || isMeeting ? participantIds : [],
        // 회의 전용 필드
        location_type: isMeeting ? form.location_type : "",
        meet_url:
          isMeeting && form.location_type === "online" ? form.meet_url : "",
        resource:
          isMeeting && form.location_type === "offline_room"
            ? form.resource
            : null,
        agenda: isMeeting ? form.agenda : "",
        is_urgent: isMeeting ? form.is_urgent : false,
      };

      if (mode === "create") {
        await scheduleApi.create(payload);
      } else {
        await scheduleApi.update(initial.id, payload);
      }

      onSaved?.();
    } catch (err) {
      console.error("저장 실패:", err);
      alert("저장에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <PageHeader
        className="mb-0 pb-2 border-b border-gray-200"
        title={mode === "create" ? "일정 등록" : "일정 수정"}
      >
        {form.is_urgent && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
            <AlertTriangle size={12} />
            긴급
          </span>
        )}
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          취소
        </button>
        <button
          type="submit"
          form={formId}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "저장 중..." : mode === "create" ? "등록" : "저장"}
        </button>
      </PageHeader>

      <form id={formId} onSubmit={handleSubmit} className="space-y-4">
        {/* scope 선택 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            일정 구분
          </label>
          <div className="flex gap-2">
            {[
              { value: "personal", label: "개인", color: "green" },
              { value: "company", label: "회사", color: "red" },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                disabled={mode === "edit"}
                onClick={() => {
                  setForm((prev) => ({ ...prev, scope: opt.value }));
                  setParticipantIds([]);
                }}
                className={`
                  px-4 py-2 rounded-lg border text-sm
                  ${
                    form.scope === opt.value
                      ? opt.color === "green"
                        ? "bg-green-600 text-white border-green-600"
                        : "bg-red-600 text-white border-red-600"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  }
                  ${mode === "edit" ? "opacity-50 cursor-not-allowed" : ""}
                `}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 일정 유형 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            일정 유형
          </label>
          <select
            name="event_type"
            value={form.event_type}
            onChange={onChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {EVENT_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* 제목 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            제목 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="title"
            value={form.title}
            onChange={onChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="일정 제목을 입력하세요"
          />
        </div>

        {/* ===== 회의 전용 필드 ===== */}
        {isMeeting && (
          <>
            {/* 긴급 여부 */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="is_urgent"
                  checked={form.is_urgent}
                  onChange={onChange}
                  className="rounded text-red-600"
                />
                <span className="text-sm text-gray-700 flex items-center gap-1">
                  <AlertTriangle size={14} className="text-red-500" />
                  긴급 회의
                </span>
              </label>
            </div>

            {/* 장소 구분 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                장소 구분
              </label>
              <select
                name="location_type"
                value={form.location_type}
                onChange={onChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {LOCATION_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 온라인 링크 */}
            {form.location_type === "online" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  온라인 링크
                </label>
                <input
                  type="url"
                  name="meet_url"
                  value={form.meet_url}
                  onChange={onChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="https://meet.google.com/..."
                />
              </div>
            )}

            {/* 회의실 선택 */}
            {form.location_type === "offline_room" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  회의실
                </label>
                <select
                  name="resource"
                  value={form.resource || ""}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      resource: e.target.value || null,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">회의실 선택</option>
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name} ({room.capacity}명)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* 안건 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                안건
              </label>
              <textarea
                name="agenda"
                value={form.agenda}
                onChange={onChange}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="회의 안건을 입력하세요"
              />
            </div>
          </>
        )}

        {/* 일반 장소 (회의가 아닌 경우) */}
        {!isMeeting && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              장소
            </label>
            <input
              type="text"
              name="location"
              value={form.location}
              onChange={onChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="장소를 입력하세요 (선택)"
            />
          </div>
        )}

        {/* 오프라인 주소 (회의 + 오프라인 주소 타입일 때) */}
        {isMeeting && form.location_type === "offline_address" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              주소
            </label>
            <input
              type="text"
              name="location"
              value={form.location}
              onChange={onChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="회의 장소 주소를 입력하세요"
            />
          </div>
        )}

        {/* 종일 */}
        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="is_all_day"
              checked={form.is_all_day}
              onChange={onChange}
              className="rounded text-blue-600"
            />
            <span className="text-sm text-gray-700">종일</span>
          </label>
        </div>

        {/* 일시 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              시작 날짜
            </label>
            <input
              type="date"
              name="date"
              value={form.date}
              onChange={onChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          {!form.is_all_day && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                시작 시간
              </label>
              <input
                type="time"
                name="time"
                value={form.time}
                onChange={onChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              종료 날짜
            </label>
            <input
              type="date"
              name="end_date"
              value={form.end_date}
              onChange={onChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          {!form.is_all_day && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                종료 시간
              </label>
              <input
                type="time"
                name="end_time"
                value={form.end_time}
                onChange={onChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}
        </div>

        {/* 캘린더 선택 */}
        {calendars.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              캘린더
            </label>
            <select
              name="calendar"
              value={form.calendar || ""}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  calendar: e.target.value || null,
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">캘린더 선택 (선택사항)</option>
              {calendars.map((cal) => (
                <option key={cal.id} value={cal.id}>
                  {cal.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 색상 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            색상
          </label>
          <input
            type="color"
            name="color"
            value={form.color}
            onChange={onChange}
            className="w-16 h-10 border border-gray-300 rounded-lg cursor-pointer"
          />
        </div>

        {/* 참여자 (회사 일정 또는 회의일 때) */}
        {(form.scope === "company" || isMeeting) && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              참여자
            </label>
            <div className="border border-gray-300 rounded-lg p-3 max-h-40 overflow-y-auto">
              {users.length === 0 ? (
                <p className="text-gray-400 text-sm">사용자가 없습니다.</p>
              ) : (
                <div className="space-y-2">
                  {users.map((user) => (
                    <label
                      key={user.id}
                      className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={participantIds.includes(user.id)}
                        onChange={() => toggleParticipant(user.id)}
                        className="rounded text-blue-600"
                      />
                      <span className="text-sm">
                        {user.last_name}
                        {user.first_name}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 메모 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            메모
          </label>
          <textarea
            name="memo"
            value={form.memo}
            onChange={onChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="메모를 입력하세요"
          />
        </div>

      </form>
    </div>
  );
}
