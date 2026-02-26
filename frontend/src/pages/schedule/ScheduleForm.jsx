// src/pages/schedule/ScheduleForm.jsx
import React, { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { Search, X, Edit, Trash2, Check } from "lucide-react";
import { scheduleApi, calendarApi } from "../../api/schedule";
import api from "../../api/axios";
import PageHeader from "../../components/common/ui/PageHeader";
import UserSelectModal from "../../components/common/ui/UserSelectModal";
import { useAuth } from "../../context/AuthContext";

const HEADQUARTERS_FALLBACK_VALUE = "__headquarters__";

const getUserDisplayName = (user) =>
  `${user?.last_name || ""}${user?.first_name || ""}`.trim() ||
  user?.username ||
  "";

function flattenCalendars(nodes = []) {
  const out = [];
  const walk = (list) => {
    list.forEach((node) => {
      out.push(node);
      if (Array.isArray(node?.sub_calendars) && node.sub_calendars.length > 0) {
        walk(node.sub_calendars);
      }
    });
  };
  walk(nodes);
  return out;
}

export default function ScheduleForm({
  mode = "create",
  initial = null,
  initialDate = new Date(),
  companyId = null,
  defaultScope = "personal",
  preferredCalendarId = null,
  onSaved,
  onClose,
  onEdit,
  onDelete,
  deleting = false,
}) {
  const isViewMode = mode === "view";
  const isEditMode = mode === "edit";
  const formTitle = mode === "create" ? "일정 등록" : mode === "edit" ? "일정 수정" : "일정 상세";
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [departmentOrderById, setDepartmentOrderById] = useState({});
  const [positionLevelById, setPositionLevelById] = useState({});
  const [showParticipantModal, setShowParticipantModal] = useState(false);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [participantIds, setParticipantIds] = useState([]);
  const formId = "schedule-form";

  const [form, setForm] = useState({
    title: initial?.title || "",
    scope: initial?.scope || defaultScope,
    location: initial?.location || "",
    date: initial?.start?.slice(0, 10) || format(initialDate, "yyyy-MM-dd"),
    time: initial?.start?.slice(11, 16) || "09:00",
    end_time: initial?.end?.slice(11, 16) || "",
    is_all_day: initial?.is_all_day || false,
    memo: initial?.memo || "",
    calendar: initial?.calendar
      ? String(initial.calendar)
      : preferredCalendarId
      ? String(preferredCalendarId)
      : "",
  });

  const loadUsers = useCallback(async () => {
    try {
      const res = await api.get("core/users/", {
        params: { page_size: 1000 },
      });
      setUsers(res.data?.results ?? res.data ?? []);
    } catch (err) {
      console.error("사용자 목록 로드 실패:", err);
      setUsers([]);
    }
  }, []);

  const loadDepartments = useCallback(async () => {
    try {
      const res = await api.get("core/departments/", {
        params: { page_size: 1000 },
      });
      const list = res.data?.results ?? res.data ?? [];
      const nextOrderById = {};
      list.forEach((department) => {
        if (department?.id == null) return;
        const parsedOrder = Number(department.order);
        nextOrderById[String(department.id)] = Number.isFinite(parsedOrder)
          ? parsedOrder
          : Number.MAX_SAFE_INTEGER;
      });
      setDepartmentOrderById(nextOrderById);
    } catch (err) {
      console.error("부서 목록 로드 실패:", err);
      setDepartmentOrderById({});
    }
  }, []);

  const loadPositions = useCallback(async () => {
    try {
      const res = await api.get("core/positions/", {
        params: { page_size: 1000 },
      });
      const list = res.data?.results ?? res.data ?? [];
      const nextPositionLevelById = {};
      list.forEach((position) => {
        if (position?.id == null) return;
        const parsedLevel = Number(position.level);
        nextPositionLevelById[String(position.id)] = Number.isFinite(parsedLevel)
          ? parsedLevel
          : Number.MAX_SAFE_INTEGER;
      });
      setPositionLevelById(nextPositionLevelById);
    } catch (err) {
      console.error("직위 목록 로드 실패:", err);
      setPositionLevelById({});
    }
  }, []);

  useEffect(() => {
    if (form.scope !== "company") return;
    loadUsers();
    loadDepartments();
    loadPositions();
  }, [form.scope, loadUsers, loadDepartments, loadPositions]);

  useEffect(() => {
    if (!showParticipantModal) return;
    loadDepartments();
    loadPositions();
  }, [showParticipantModal, loadDepartments, loadPositions]);

  // 카테고리 목록 로드 (본사일정 + 사용자정의)
  useEffect(() => {
    (async () => {
      try {
        const [myRes, customRes] = await Promise.all([
          calendarApi.myCalendars(),
          calendarApi.customCalendars(),
        ]);
        const myCalendars = myRes.data ?? [];
        const customCalendars = flattenCalendars(customRes.data ?? []);

        const headquarters =
          myCalendars.find(
            (cal) =>
              cal?.category === "headquarters" || cal?.name === "본사일정",
          ) ||
          customCalendars.find(
            (cal) =>
              cal?.category === "headquarters" || cal?.name === "본사일정",
          );

        const headquartersOptionId = headquarters?.id
          ? String(headquarters.id)
          : HEADQUARTERS_FALLBACK_VALUE;
        const options = [{ id: headquartersOptionId, name: "본사일정" }];

        const seen = new Set(options.map((opt) => opt.id));
        customCalendars.forEach((cal) => {
          const id = String(cal?.id ?? "");
          if (!id || seen.has(id)) return;
          options.push({ id, name: cal?.name || "사용자 정의 일정" });
          seen.add(id);
        });

        setCategoryOptions(options);
        setForm((prev) => {
          if (initial?.calendar)
            return { ...prev, calendar: String(initial.calendar) };
          if (preferredCalendarId) {
            const preferredId = String(preferredCalendarId);
            if (options.some((opt) => opt.id === preferredId)) {
              return { ...prev, calendar: preferredId };
            }
          }
          if (prev.calendar && options.some((opt) => opt.id === String(prev.calendar))) {
            return prev;
          }
          return { ...prev, calendar: headquartersOptionId };
        });
      } catch (err) {
        console.error("카테고리 목록 로드 실패:", err);
        setCategoryOptions([
          { id: HEADQUARTERS_FALLBACK_VALUE, name: "본사일정" },
        ]);
        setForm((prev) => {
          if (initial?.calendar) return prev;
          if (preferredCalendarId) {
            return { ...prev, calendar: String(preferredCalendarId) };
          }
          if (prev.calendar) return prev;
          return { ...prev, calendar: HEADQUARTERS_FALLBACK_VALUE };
        });
      }
    })();
  }, [initial?.calendar, preferredCalendarId]);

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

  useEffect(() => {
    if (!user) return;
    setParticipantIds((prev) =>
      prev.filter((idValue) => {
        const targetUser = users.find((u) => String(u.id) === String(idValue));
        const isCurrentById =
          user.id != null && String(idValue) === String(user.id);
        const isCurrentByUsername =
          Boolean(user.username) && targetUser?.username === user.username;
        return !(isCurrentById || isCurrentByUsername);
      }),
    );
  }, [user, users]);

  const removeParticipant = (userId) => {
    setParticipantIds((prev) => prev.filter((idValue) => idValue !== userId));
  };

  const getParticipantName = (userId) => {
    const targetUser = users.find((u) => String(u.id) === String(userId));
    if (!targetUser) return `사용자 ${userId}`;
    return getUserDisplayName(targetUser);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isViewMode) return;
    if (!form.title.trim()) return alert("제목을 입력해주세요.");
    if (!form.date) return alert("날짜를 선택해주세요.");

    setLoading(true);
    try {
      const start = new Date(
        `${form.date}T${form.time || "00:00"}:00`,
      ).toISOString();
      const end = !form.is_all_day && form.end_time
        ? new Date(
            `${form.date}T${form.end_time}:00`,
          ).toISOString()
        : null;

      const selectedCalendarId =
        form.calendar && form.calendar !== HEADQUARTERS_FALLBACK_VALUE
          ? Number(form.calendar)
          : null;

      const payload = {
        title: form.title,
        scope: form.scope,
        event_type: "general",
        location: form.location,
        start,
        end,
        is_all_day: form.is_all_day,
        memo: form.memo,
        calendar: Number.isFinite(selectedCalendarId)
          ? selectedCalendarId
          : null,
        company: form.scope === "company" && companyId ? companyId : null,
        participant_ids: form.scope === "company" ? participantIds : [],
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

  const memoDisplayValue = isViewMode ? form.memo || "-" : form.memo;

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <PageHeader
        className="mb-0 pb-2 border-b border-gray-200"
        title={formTitle}
      >
        {isViewMode ? (
          <div className="flex items-center gap-3">
            {onEdit && (
              <button
                type="button"
                onClick={onEdit}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Edit size={16} />
                수정
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={onDelete}
                disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                <Trash2 size={16} />
                {deleting ? "삭제 중..." : "삭제"}
              </button>
            )}
          </div>
        ) : (
          <>
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
          </>
        )}
      </PageHeader>

      <form id={formId} onSubmit={handleSubmit} className="space-y-4">
        {/* scope 선택 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            일정 구분
          </label>
          <div className="flex gap-2">
            {[
              { value: "company", label: "공유", color: "red" },
              { value: "personal", label: "개인", color: "green" },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                disabled={isEditMode || isViewMode}
                onClick={() => {
                  if (isViewMode) return;
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
                  ${isEditMode ? "opacity-50 cursor-not-allowed" : isViewMode ? "cursor-default" : ""}
                `}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 카테고리 구분 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            카테고리 구분
          </label>
          <select
            name="calendar"
            value={form.calendar || ""}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                calendar: e.target.value || "",
              }))
            }
            disabled={isViewMode}
            className={`w-full px-3 py-2 border border-gray-300 rounded-lg ${
              isViewMode
                ? "bg-gray-50 text-gray-900 disabled:text-gray-900 disabled:opacity-100 cursor-default"
                : "focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            }`}
          >
            {categoryOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.name}
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
            readOnly={isViewMode}
            className={`w-full px-3 py-2 border border-gray-300 rounded-lg ${
              isViewMode
                ? "bg-gray-50 text-gray-900 placeholder:text-gray-500 cursor-default"
                : "focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            }`}
            placeholder="일정 제목을 입력하세요"
          />
        </div>

        {/* 장소 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            장소
          </label>
          <input
            type="text"
            name="location"
            value={form.location}
            onChange={onChange}
            readOnly={isViewMode}
            className={`w-full px-3 py-2 border border-gray-300 rounded-lg ${
              isViewMode
                ? "bg-gray-50 text-gray-900 placeholder:text-gray-500 cursor-default"
                : "focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            }`}
            placeholder={isViewMode ? "" : "장소를 입력하세요"}
          />
        </div>

        {/* 종일 */}
        <div>
          <label className={`flex items-center gap-2 ${isViewMode ? "cursor-default" : "cursor-pointer"}`}>
            {isViewMode ? (
              <span
                className={`inline-flex h-4 w-4 items-center justify-center rounded border ${
                  form.is_all_day
                    ? "bg-blue-600 border-blue-600 text-white"
                    : "bg-white border-gray-300 text-transparent"
                }`}
                aria-hidden="true"
              >
                {form.is_all_day && <Check size={12} strokeWidth={3} />}
              </span>
            ) : (
              <input
                type="checkbox"
                name="is_all_day"
                checked={form.is_all_day}
                onChange={onChange}
                className="rounded text-blue-600"
              />
            )}
            <span className={`text-sm ${isViewMode ? "text-gray-900" : "text-gray-700"}`}>종일</span>
          </label>
        </div>

        {/* 일시 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            날짜 <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            name="date"
            value={form.date}
            onChange={onChange}
            disabled={isViewMode}
            className={`w-full px-3 py-2 border border-gray-300 rounded-lg ${
              isViewMode
                ? "bg-gray-50 text-gray-900 disabled:text-gray-900 disabled:opacity-100 cursor-default"
                : "focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            }`}
          />
        </div>

        {!form.is_all_day && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                시작 시간
              </label>
              <input
                type="time"
                name="time"
                value={form.time}
                onChange={onChange}
                disabled={isViewMode}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg ${
                  isViewMode
                    ? "bg-gray-50 text-gray-900 disabled:text-gray-900 disabled:opacity-100 cursor-default"
                    : "focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                }`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                종료 시간
              </label>
              <input
                type="time"
                name="end_time"
                value={form.end_time}
                onChange={onChange}
                disabled={isViewMode}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg ${
                  isViewMode
                    ? "bg-gray-50 text-gray-900 disabled:text-gray-900 disabled:opacity-100 cursor-default"
                    : "focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                }`}
              />
            </div>
          </div>
        )}

        {/* 참여자 (회사 일정일 때) */}
        {form.scope === "company" && (
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="text-sm font-medium text-gray-700">참여자</div>
              {!isViewMode && (
                <button
                  type="button"
                  onClick={() => setShowParticipantModal(true)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-sky-700 bg-sky-50 rounded-lg hover:bg-sky-100"
                >
                  <Search size={15} />
                  참여자 검색
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {participantIds.length === 0 ? (
                <div className="w-full px-3 py-2 text-sm text-gray-400 border border-dashed border-gray-200 rounded-lg">
                  선택된 참여자가 없습니다.
                </div>
              ) : (
                participantIds.map((uid) => (
                  <span
                    key={uid}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-sky-100 text-sky-700 rounded text-sm"
                  >
                    {getParticipantName(uid)}
                    {!isViewMode && (
                      <button
                        type="button"
                        onClick={() => removeParticipant(uid)}
                        className="text-sky-500 hover:text-sky-700"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </span>
                ))
              )}
            </div>
          </div>
        )}

        {/* 내용 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            내용
          </label>
          <textarea
            name="memo"
            value={memoDisplayValue}
            onChange={onChange}
            readOnly={isViewMode}
            rows={3}
            className={`w-full px-3 py-2 border border-gray-300 rounded-lg ${
              isViewMode
                ? "bg-gray-50 text-gray-900 placeholder:text-gray-500 cursor-default"
                : "focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            }`}
            placeholder={isViewMode ? "" : "내용을 입력하세요"}
          />
        </div>
      </form>

      {!isViewMode && (
        <UserSelectModal
          isOpen={showParticipantModal}
          onClose={() => setShowParticipantModal(false)}
          users={users}
          departmentOrderById={departmentOrderById}
          positionLevelById={positionLevelById}
          initialSelectedIds={participantIds}
          currentUserId={user?.id}
          currentUsername={user?.username}
          onSave={(nextParticipantIds) => {
            setParticipantIds(nextParticipantIds);
            setShowParticipantModal(false);
          }}
          entityLabel="참여자"
        />
      )}
    </div>
  );
}

