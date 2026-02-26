import React, { useEffect, useState } from "react";
import { Search, Users, UserPlus, ChevronDown, ChevronRight, X } from "lucide-react";

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

export default function UserSelectModal({
  isOpen,
  onClose,
  users = [],
  departmentOrderById = {},
  positionLevelById = {},
  initialSelectedIds = [],
  currentUserId,
  currentUsername,
  onSave,
  entityLabel = "대상자",
}) {
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

  const addUser = (userId) => {
    setSelectedIds((prev) =>
      prev.includes(userId) ? prev : [...prev, userId],
    );
  };

  const removeUser = (userId) => {
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
            {entityLabel} 선택 관리
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
                                  onClick={() => addUser(user.id)}
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
                선택된 {entityLabel} ({selectedUsers.length}명)
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
                <p className="text-sm">왼쪽 목록에서 {entityLabel}를 선택하세요</p>
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
                        onClick={() => removeUser(user.id)}
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
}
