// src/pages/schedule/ScheduleForm.jsx
import React, { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { Search, Users, UserPlus, ChevronDown, ChevronRight, X } from "lucide-react";
import { scheduleApi, calendarApi } from "../../api/schedule";
import api from "../../api/axios";
import PageHeader from "../../components/common/ui/PageHeader";
import { useAuth } from "../../context/AuthContext";

const HEADQUARTERS_FALLBACK_VALUE = "__headquarters__";

const getUserDisplayName = (user) =>
  `${user?.last_name || ""}${user?.first_name || ""}`.trim() ||
  user?.username ||
  "";

const getUserCompanyName = (user) =>
  user?.primary_membership?.company_name ||
  user?.company?.name ||
  user?.company_name ||
  "미지정 회사";

const getUserDepartmentName = (user) =>
  user?.primary_membership?.department_name ||
  user?.department?.name ||
  user?.department_name ||
  "";

const getUserPositionName = (user) =>
  user?.primary_membership?.position_name ||
  user?.position?.name ||
  user?.position_name ||
  "";

const getUserPositionId = (user) =>
  user?.primary_membership?.position_id ||
  user?.position?.id ||
  user?.position_id ||
  null;

const getUserPositionLevel = (user, positionLevelById = {}) => {
  const directLevel = Number(
    user?.primary_membership?.position_level ??
      user?.position?.level ??
      user?.position_level,
  );
  if (Number.isFinite(directLevel)) return directLevel;

  const positionId = getUserPositionId(user);
  if (positionId != null) {
    const mappedLevel = Number(positionLevelById[String(positionId)]);
    if (Number.isFinite(mappedLevel)) return mappedLevel;
  }

  return Number.MAX_SAFE_INTEGER;
};

const userNameCollator = new Intl.Collator("ko", {
  sensitivity: "base",
  numeric: true,
});

const compareUsersByPositionThenName = (a, b, positionLevelById) => {
  const aLevel = getUserPositionLevel(a, positionLevelById);
  const bLevel = getUserPositionLevel(b, positionLevelById);
  if (aLevel !== bLevel) return aLevel - bLevel;

  const nameCompare = userNameCollator.compare(
    getUserDisplayName(a),
    getUserDisplayName(b),
  );
  if (nameCompare !== 0) return nameCompare;

  return userNameCollator.compare(a?.username || "", b?.username || "");
};

const getUserSearchText = (user) => {
  const fields = [
    getUserDisplayName(user),
    user?.username || "",
    getUserCompanyName(user),
    getUserDepartmentName(user),
    getUserPositionName(user),
  ];
  return fields.join(" ").toLowerCase();
};

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

const ParticipantSelectModal = ({
  isOpen,
  onClose,
  users,
  departmentOrderById,
  positionLevelById,
  initialSelectedIds,
  currentUserId,
  currentUsername,
  onSave,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [expandedGroupKeys, setExpandedGroupKeys] = useState({});

  useEffect(() => {
    if (!isOpen) return;
    setSelectedIds(
      initialSelectedIds.filter((userId) => {
        const targetUser = users.find((u) => String(u.id) === String(userId));
        const isCurrentById =
          currentUserId != null && String(userId) === String(currentUserId);
        const isCurrentByUsername =
          Boolean(currentUsername) && targetUser?.username === currentUsername;
        return !(isCurrentById || isCurrentByUsername);
      }),
    );
    setSearchQuery("");
    setExpandedGroupKeys({});
  }, [isOpen, initialSelectedIds, currentUserId, currentUsername, users]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleEsc = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const selectedIdSet = new Set(selectedIds);
  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredUsers = users.filter((user) => {
    const isCurrentById =
      currentUserId != null && String(user.id) === String(currentUserId);
    const isCurrentByUsername =
      Boolean(currentUsername) && user.username === currentUsername;
    if (isCurrentById || isCurrentByUsername) return false;
    if (selectedIdSet.has(user.id)) return false;
    if (!normalizedQuery) return true;
    return getUserSearchText(user).includes(normalizedQuery);
  });

  const groupedUsers = filteredUsers.reduce((acc, user) => {
    const departmentName = getUserDepartmentName(user) || "부서 미지정";
    const departmentId =
      user?.primary_membership?.department_id ??
      user?.department?.id ??
      user?.department_id ??
      null;
    const rawDepartmentOrder =
      user?.primary_membership?.department_order ??
      user?.department?.order ??
      user?.department_order ??
      (departmentId != null ? departmentOrderById[String(departmentId)] : null);
    const departmentOrder = Number(rawDepartmentOrder);
    const normalizedDepartmentOrder = Number.isFinite(departmentOrder)
      ? departmentOrder
      : Number.MAX_SAFE_INTEGER;
    const groupKey =
      departmentId != null
        ? `department-${departmentId}`
        : `department-name-${departmentName}`;

    if (!acc[groupKey]) {
      acc[groupKey] = {
        groupKey,
        departmentName,
        departmentOrder: normalizedDepartmentOrder,
        users: [],
      };
    }
    acc[groupKey].departmentOrder = Math.min(
      acc[groupKey].departmentOrder,
      normalizedDepartmentOrder,
    );
    acc[groupKey].users.push(user);
    return acc;
  }, {});

  const groupedUserEntries = Object.values(groupedUsers)
    .map((group) => ({
      ...group,
      users: [...group.users].sort((a, b) =>
        compareUsersByPositionThenName(a, b, positionLevelById),
      ),
    }))
    .sort((a, b) => {
      if (a.departmentOrder !== b.departmentOrder) {
        return a.departmentOrder - b.departmentOrder;
      }
      return a.departmentName.localeCompare(b.departmentName, "ko");
    });

  const selectedUsers = selectedIds
    .map((userId) => users.find((user) => user.id === userId))
    .filter(Boolean);

  const addParticipant = (userId) => {
    setSelectedIds((prev) =>
      prev.includes(userId) ? prev : [...prev, userId],
    );
  };

  const removeParticipant = (userId) => {
    setSelectedIds((prev) => prev.filter((id) => id !== userId));
  };

  const addDepartmentUsers = (departmentUsers) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      departmentUsers.forEach((user) => next.add(user.id));
      return Array.from(next);
    });
  };

  const toggleDepartmentGroup = (groupKey) => {
    setExpandedGroupKeys((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 mx-4 w-full max-w-5xl h-[88vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            참여자 선택 관리
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 rounded-lg hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2">
          <div className="p-4 border-b md:border-b-0 md:border-r border-gray-200 overflow-y-auto">
            <div className="mb-3">
              <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <Users size={16} />
                사용자 목록
              </p>
            </div>

            <div className="relative mb-4">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="이름, 아이디, 회사, 부서로 검색"
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
              />
            </div>

            {groupedUserEntries.length === 0 ? (
              <div className="py-12 text-center text-sm text-gray-500 border border-dashed border-gray-200 rounded-xl">
                검색 조건에 맞는 사용자가 없습니다.
              </div>
            ) : (
              <div className="space-y-3">
                {groupedUserEntries.map(
                  ({ groupKey, departmentName, users: departmentUsers }) => {
                    const isExpanded = Boolean(expandedGroupKeys[groupKey]);
                    return (
                      <div
                        key={groupKey}
                        className="border border-gray-200 rounded-xl p-3 bg-gray-50/50"
                      >
                        <div className="flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => toggleDepartmentGroup(groupKey)}
                            className="inline-flex min-w-0 items-center gap-2 text-left"
                          >
                            {isExpanded ? (
                              <ChevronDown
                                size={16}
                                className="text-gray-500 shrink-0"
                              />
                            ) : (
                              <ChevronRight
                                size={16}
                                className="text-gray-500 shrink-0"
                              />
                            )}
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {departmentName}
                            </p>
                            <span className="px-2 py-0.5 text-xs bg-gray-200 text-gray-700 rounded-full">
                              {departmentUsers.length}명
                            </span>
                          </button>
                          <button
                            onClick={() => addDepartmentUsers(departmentUsers)}
                            className="px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-lg hover:bg-green-200"
                          >
                            전체추가
                          </button>
                        </div>

                        {isExpanded && (
                          <div className="mt-2 space-y-1">
                            {departmentUsers.map((user) => {
                              const fullName = getUserDisplayName(user);
                              const position = getUserPositionName(user);

                              return (
                                <button
                                  key={user.id}
                                  onClick={() => addParticipant(user.id)}
                                  className="w-full text-left px-2.5 py-2 rounded-lg bg-white border border-gray-200 hover:border-sky-200 hover:bg-sky-50 transition-colors"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium text-gray-900 truncate">
                                        {fullName}
                                        {position && (
                                          <span className="ml-1 text-gray-500 font-normal">
                                            {position}
                                          </span>
                                        )}
                                      </p>
                                    </div>
                                    <span className="inline-flex items-center gap-1 text-xs text-green-700">
                                      <UserPlus size={14} />
                                      추가
                                    </span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  },
                )}
              </div>
            )}
          </div>

          <div className="p-4 overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-800">
                선택된 참여자 ({selectedUsers.length}명)
              </p>
              {selectedUsers.length > 0 && (
                <button
                  onClick={() => setSelectedIds([])}
                  className="text-xs text-gray-500 hover:text-red-500"
                >
                  전체제거
                </button>
              )}
            </div>

            {selectedUsers.length === 0 ? (
              <div className="h-full min-h-[240px] flex flex-col items-center justify-center text-center text-gray-400">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                  <Users size={28} />
                </div>
                <p className="text-sm">왼쪽 목록에서 참여자를 선택하세요.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedUsers.map((user) => {
                  const fullName = getUserDisplayName(user);
                  const department = getUserDepartmentName(user);
                  const position = getUserPositionName(user);

                  return (
                    <div
                      key={user.id}
                      className="flex items-center justify-between gap-3 p-3 rounded-xl border border-gray-200 bg-white"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {fullName}
                          {position && (
                            <span className="ml-1 text-gray-500 font-normal">
                              {position}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {department}
                        </p>
                      </div>
                      <button
                        onClick={() => removeParticipant(user.id)}
                        className="p-1 text-gray-400 rounded-md hover:bg-red-50 hover:text-red-500"
                        aria-label={`${fullName} 제거`}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            닫기
          </button>
          <button
            onClick={() => onSave(selectedIds)}
            className="px-4 py-2 text-sm text-white bg-sky-500 rounded-lg hover:bg-sky-600"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
};

export default function ScheduleForm({
  mode = "create",
  initial = null,
  initialDate = new Date(),
  companyId = null,
  defaultScope = "personal",
  onSaved,
  onClose,
}) {
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
    end_date: initial?.end?.slice(0, 10) || "",
    end_time: initial?.end?.slice(11, 16) || "",
    is_all_day: initial?.is_all_day || false,
    memo: initial?.memo || "",
    calendar: initial?.calendar ? String(initial.calendar) : "",
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
          if (prev.calendar) return prev;
          return { ...prev, calendar: headquartersOptionId };
        });
      } catch (err) {
        console.error("카테고리 목록 로드 실패:", err);
        setCategoryOptions([
          { id: HEADQUARTERS_FALLBACK_VALUE, name: "본사일정" },
        ]);
        setForm((prev) => {
          if (initial?.calendar) return prev;
          if (prev.calendar) return prev;
          return { ...prev, calendar: HEADQUARTERS_FALLBACK_VALUE };
        });
      }
    })();
  }, [initial?.calendar]);

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

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <PageHeader
        className="mb-0 pb-2 border-b border-gray-200"
        title={mode === "create" ? "일정 등록" : "일정 수정"}
      >
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
              { value: "company", label: "공유", color: "red" },
              { value: "personal", label: "개인", color: "green" },
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
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="장소를 입력하세요"
          />
        </div>

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
              시작 날짜 <span className="text-red-500">*</span>
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

        {/* 참여자 (회사 일정일 때) */}
        {form.scope === "company" && (
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="text-sm font-medium text-gray-700">참여자</div>
              <button
                type="button"
                onClick={() => setShowParticipantModal(true)}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-sky-700 bg-sky-50 rounded-lg hover:bg-sky-100"
              >
                <Search size={15} />
                참여자 검색
              </button>
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
                    <button
                      type="button"
                      onClick={() => removeParticipant(uid)}
                      className="text-sky-500 hover:text-sky-700"
                    >
                      <X size={14} />
                    </button>
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
            value={form.memo}
            onChange={onChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="내용을 입력하세요"
          />
        </div>
      </form>

      <ParticipantSelectModal
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
      />
    </div>
  );
}
