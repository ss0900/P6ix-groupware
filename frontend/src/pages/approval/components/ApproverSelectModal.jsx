import React, { useCallback, useEffect, useState } from "react";
import {
  Search,
  Users,
  UserPlus,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  X,
  Trash2,
  Pencil,
} from "lucide-react";

const getUserDisplayName = (user) =>
  `${user?.last_name || ""}${user?.first_name || ""}`.trim() ||
  user?.username ||
  "";

const getUserDepartmentName = (user) =>
  user?.primary_membership?.department_name ||
  user?.department?.name ||
  user?.department_name ||
  "";

const getUserCompanyName = (user) =>
  user?.primary_membership?.company_name ||
  user?.company?.name ||
  user?.company_name ||
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

const APPROVAL_LINE_TYPE_SET = new Set(["approval", "agreement", "reference"]);

const normalizeApprovalType = (value) =>
  APPROVAL_LINE_TYPE_SET.has(value) ? value : "approval";

const APPROVAL_DECISION_OPTIONS = [
  { value: "approval", label: "결재" },
  { value: "delegate", label: "전결" },
];

const APPROVAL_DECISION_SET = new Set(
  APPROVAL_DECISION_OPTIONS.map((option) => option.value),
);

const normalizeDecisionType = (value) =>
  APPROVAL_DECISION_SET.has(value) ? value : "approval";

const APPROVAL_AGREEMENT_OPTIONS = [
  { value: "none", label: "선택" },
  { value: "agreement", label: "합의" },
];

const mapApprovalTypeToAgreementOption = (approvalType) =>
  normalizeApprovalType(approvalType) === "agreement" ? "agreement" : "none";

const mapAgreementOptionToApprovalType = (agreementOption) =>
  agreementOption === "agreement" ? "agreement" : "approval";


const ApproverSelectModal = ({
  isOpen,
  onClose,
  users,
  departmentOrderById,
  positionLevelById,
  initialSelectedLines,
  savedPresets,
  presetLoading,
  presetSaving,
  presetUpdatingId,
  presetDeletingId,
  onSavePreset,
  onUpdatePreset,
  onDeletePreset,
  onSave,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLines, setSelectedLines] = useState([]);
  const [expandedGroupKeys, setExpandedGroupKeys] = useState({});
  const [expandedPresetIds, setExpandedPresetIds] = useState({});
  const [editingPresetId, setEditingPresetId] = useState(null);
  const [editingPresetName, setEditingPresetName] = useState("");

  const buildLineFromUser = useCallback(
    (targetUser, previousLine = {}) => ({
      id: targetUser.id,
      name:
        getUserDisplayName(targetUser) ||
        previousLine.name ||
        targetUser.username ||
        `사용자 ${targetUser.id}`,
      position: getUserPositionName(targetUser) || previousLine.position || "",
      department:
        getUserDepartmentName(targetUser) || previousLine.department || "",
      company: getUserCompanyName(targetUser) || previousLine.company || "",
      approval_type: normalizeApprovalType(previousLine.approval_type),
      decision_type: normalizeDecisionType(previousLine.decision_type),
    }),
    [],
  );

  useEffect(() => {
    if (!isOpen) return;
    const uniqueLines = [];
    const seen = new Set();
    initialSelectedLines.forEach((line) => {
      if (line?.id == null) return;
      const key = String(line.id);
      if (seen.has(key)) return;
      seen.add(key);
      uniqueLines.push({
        id: line.id,
        name: line.name || "",
        position: line.position || "",
        department: line.department || "",
        company: line.company || "",
        approval_type: normalizeApprovalType(line.approval_type),
        decision_type: normalizeDecisionType(line.decision_type),
      });
    });
    setSelectedLines(uniqueLines);
    setSearchQuery("");
    setExpandedGroupKeys({});
    setExpandedPresetIds({});
    setEditingPresetId(null);
    setEditingPresetName("");
  }, [isOpen, initialSelectedLines]);

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

  useEffect(() => {
    if (editingPresetId == null) return;
    const matchedPreset = savedPresets.find(
      (preset) => preset.id === editingPresetId,
    );
    if (!matchedPreset) {
      setEditingPresetId(null);
      setEditingPresetName("");
      return;
    }
    if (matchedPreset.name !== editingPresetName) {
      setEditingPresetName(matchedPreset.name || "");
    }
  }, [savedPresets, editingPresetId, editingPresetName]);

  if (!isOpen) return null;

  const selectedIdSet = new Set(selectedLines.map((line) => String(line.id)));
  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredUsers = users.filter((targetUser) => {
    const departmentName = getUserDepartmentName(targetUser);
    if (!departmentName || !departmentName.trim()) return false;
    if (selectedIdSet.has(String(targetUser.id))) return false;
    if (!normalizedQuery) return true;
    return getUserSearchText(targetUser).includes(normalizedQuery);
  });

  const groupedUsers = filteredUsers.reduce((acc, targetUser) => {
    const departmentName = getUserDepartmentName(targetUser) || "부서 미지정";
    const departmentId =
      targetUser?.primary_membership?.department_id ??
      targetUser?.department?.id ??
      targetUser?.department_id ??
      null;
    const rawDepartmentOrder =
      targetUser?.primary_membership?.department_order ??
      targetUser?.department?.order ??
      targetUser?.department_order ??
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
    acc[groupKey].users.push(targetUser);
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

  const addApprover = (userId) => {
    setSelectedLines((prev) => {
      if (prev.some((line) => String(line.id) === String(userId))) {
        return prev;
      }
      const targetUser = users.find(
        (candidate) => String(candidate.id) === String(userId),
      );
      if (targetUser) {
        return [...prev, buildLineFromUser(targetUser)];
      }
      return [
        ...prev,
        {
          id: userId,
          name: `사용자 ${userId}`,
          position: "",
          department: "",
          company: "",
          approval_type: "approval",
          decision_type: "approval",
        },
      ];
    });
  };

  const removeApprover = (userId) => {
    setSelectedLines((prev) =>
      prev.filter((line) => String(line.id) !== String(userId)),
    );
  };

  const addDepartmentUsers = (departmentUsers) => {
    setSelectedLines((prev) => {
      const selectedSet = new Set(prev.map((line) => String(line.id)));
      const ordered = [...prev];
      departmentUsers.forEach((targetUser) => {
        const key = String(targetUser.id);
        if (selectedSet.has(key)) return;
        selectedSet.add(key);
        ordered.push(buildLineFromUser(targetUser));
      });
      return ordered;
    });
  };

  const handleDecisionTypeChange = (index, decisionType) => {
    setSelectedLines((prev) =>
      prev.map((line, idx) =>
        idx === index
          ? { ...line, decision_type: normalizeDecisionType(decisionType) }
          : line,
      ),
    );
  };

  const handleAgreementTypeChange = (index, agreementType) => {
    setSelectedLines((prev) =>
      prev.map((line, idx) =>
        idx === index
          ? {
              ...line,
              approval_type: mapAgreementOptionToApprovalType(agreementType),
            }
          : line,
      ),
    );
  };

  const moveLine = (index, direction) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= selectedLines.length) return;
    setSelectedLines((prev) => {
      const copied = [...prev];
      [copied[index], copied[nextIndex]] = [copied[nextIndex], copied[index]];
      return copied;
    });
  };

  const applyPreset = (preset) => {
    const nextLines = (preset?.items || []).map((item) => {
      const targetUser = users.find(
        (candidate) => String(candidate.id) === String(item.approver),
      );
      if (targetUser) {
        return buildLineFromUser(targetUser, {
          name: item.approver_name,
          position: item.approver_position,
          department: item.approver_department,
          approval_type: item.approval_type,
          decision_type: item.decision_type,
        });
      }
      return {
        id: item.approver,
        name: item.approver_name || `사용자 ${item.approver}`,
        position: item.approver_position || "",
        department: item.approver_department || "",
        company: "",
        approval_type: normalizeApprovalType(item.approval_type),
        decision_type: normalizeDecisionType(item.decision_type),
      };
    });
    setSelectedLines(nextLines);
  };

  const startEditPreset = (preset) => {
    applyPreset(preset);
    setEditingPresetId(preset.id);
    setEditingPresetName(preset.name || "");
  };

  const cancelEditPreset = () => {
    setEditingPresetId(null);
    setEditingPresetName("");
  };

  const handleSavePreset = async () => {
    if (selectedLines.length === 0) {
      alert("저장할 결재선을 먼저 구성해주세요.");
      return;
    }
    if (editingPresetId != null) {
      const trimmedName = editingPresetName.trim();
      if (!trimmedName) {
        alert("결재선 이름을 입력해주세요.");
        return;
      }
      const ok = await onUpdatePreset(editingPresetId, {
        name: trimmedName,
        lines: selectedLines,
      });
      if (ok) {
        cancelEditPreset();
      }
      return;
    }
    await onSavePreset(selectedLines);
  };

  const toggleDepartmentGroup = (groupKey) => {
    setExpandedGroupKeys((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  };

  const togglePresetDetails = (presetId) => {
    setExpandedPresetIds((prev) => ({
      ...prev,
      [presetId]: !prev[presetId],
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 mx-4 w-full max-w-5xl h-[88vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">결재선 관리</h3>
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
                onChange={(event) => setSearchQuery(event.target.value)}
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
                            className="px-2 py-1 text-xs font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600"
                          >
                            전체추가
                          </button>
                        </div>

                        {isExpanded && (
                          <div className="mt-2 space-y-1">
                            {departmentUsers.map((targetUser) => {
                              const fullName = getUserDisplayName(targetUser);
                              const position = getUserPositionName(targetUser);

                              return (
                                <button
                                  key={targetUser.id}
                                  onClick={() => addApprover(targetUser.id)}
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
                                    <span className="inline-flex items-center gap-1 text-xs text-blue-600">
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

            <div className="mt-6 pt-4 border-t border-gray-200">
              <p className="text-sm font-semibold text-gray-800">
                자주 쓰는 결재선
              </p>
              {presetLoading ? (
                <div className="mt-3 px-3 py-4 text-sm text-center text-gray-500 bg-gray-100 rounded-xl">
                  저장된 결재선을 불러오는 중입니다.
                </div>
              ) : savedPresets.length === 0 ? (
                <div className="mt-3 px-3 py-4 text-sm text-center text-gray-500 bg-gray-100 rounded-xl">
                  저장된 결재선이 없습니다.
                </div>
              ) : (
                <div className="mt-3 space-y-2">
                  {savedPresets.map((preset) => {
                    const isExpanded = Boolean(expandedPresetIds[preset.id]);
                    const presetItems = preset.items || [];

                    return (
                      <div
                        key={preset.id}
                        className={`px-3 py-2.5 border rounded-xl bg-white ${
                          editingPresetId === preset.id
                            ? "border-blue-400"
                            : "border-gray-200"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => togglePresetDetails(preset.id)}
                            className="min-w-0 inline-flex items-center gap-2 text-left"
                          >
                            {isExpanded ? (
                              <ChevronDown
                                size={14}
                                className="text-gray-500 shrink-0"
                              />
                            ) : (
                              <ChevronRight
                                size={14}
                                className="text-gray-500 shrink-0"
                              />
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {preset.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {preset.line_count}명
                              </p>
                            </div>
                          </button>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => applyPreset(preset)}
                              className="px-2 py-1 text-xs font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600"
                            >
                              적용
                            </button>
                            <button
                              type="button"
                              onClick={() => startEditPreset(preset)}
                              disabled={presetUpdatingId === preset.id}
                              className="p-1 text-gray-400 rounded-md hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
                              title="수정"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeletePreset(preset.id)}
                              disabled={
                                presetDeletingId === preset.id ||
                                presetUpdatingId === preset.id
                              }
                              className="p-1 text-gray-400 rounded-md hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
                              title="삭제"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="mt-2 pt-2 border-t border-gray-100 space-y-1.5">
                            {presetItems.length === 0 ? (
                              <div className="px-2 py-2 text-xs text-gray-500 bg-gray-50 rounded-lg">
                                저장된 결재선 구성이 없습니다.
                              </div>
                            ) : (
                              presetItems.map((item, itemIndex) => {
                                const orderNumber = Number.isFinite(
                                  Number(item.order),
                                )
                                  ? Number(item.order) + 1
                                  : itemIndex + 1;
                                const itemName =
                                  item.approver_name ||
                                  `사용자 ${item.approver}`;
                                const itemDepartment =
                                  item.approver_department || "부서 미지정";
                                return (
                                  <div
                                    key={`${preset.id}-${item.id || itemIndex}`}
                                    className="flex items-start gap-2 px-2 py-1.5 rounded-lg bg-gray-50"
                                  >
                                    <span className="mt-0.5 inline-flex items-center justify-center w-5 h-5 text-[11px] font-semibold text-blue-600 bg-blue-100 rounded-full shrink-0">
                                      {orderNumber}
                                    </span>
                                    <div className="min-w-0">
                                      <p className="text-xs font-medium text-gray-800 truncate">
                                        {itemName}
                                        {item.approver_position && (
                                          <span className="ml-1 font-normal text-gray-500">
                                            {item.approver_position}
                                          </span>
                                        )}
                                      </p>
                                      <p className="text-[11px] text-gray-500 truncate">
                                        {itemDepartment}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="p-4 overflow-y-auto">
            {editingPresetId != null && (
              <div className="mb-3 p-2.5 rounded-lg border border-blue-200 bg-blue-50/60">
                <p className="text-xs font-semibold text-blue-700 mb-2">
                  저장 결재선 수정 모드
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editingPresetName}
                    onChange={(event) =>
                      setEditingPresetName(event.target.value)
                    }
                    placeholder="결재선 이름"
                    className="flex-1 px-2.5 py-1.5 text-sm border border-blue-200 rounded-md bg-white focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none"
                  />
                  <button
                    type="button"
                    onClick={cancelEditPreset}
                    className="px-2 py-1.5 text-xs text-gray-600 border border-gray-300 rounded-md hover:bg-white"
                  >
                    취소
                  </button>
                </div>
              </div>
            )}

            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-800">
                결재선 구성 ({selectedLines.length}명)
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSavePreset}
                  disabled={
                    presetSaving ||
                    (editingPresetId != null &&
                      presetUpdatingId === editingPresetId) ||
                    selectedLines.length === 0
                  }
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-500 rounded-lg hover:bg-blue-600 disabled:opacity-50"
                >
                  {editingPresetId != null
                    ? presetUpdatingId === editingPresetId
                      ? "수정 중..."
                      : "수정 저장"
                    : presetSaving
                      ? "저장 중..."
                      : "결재선 저장"}
                </button>
                {selectedLines.length > 0 && (
                  <button
                    onClick={() => setSelectedLines([])}
                    className="text-xs text-gray-500 hover:text-red-500"
                  >
                    전체제거
                  </button>
                )}
              </div>
            </div>

            {selectedLines.length === 0 ? (
              <div className="h-full min-h-[240px] flex flex-col items-center justify-center text-center text-gray-400">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                  <Users size={28} />
                </div>
                <p className="text-sm leading-6">
                  왼쪽 목록에서
                  <br />
                  결재자를 선택해주세요.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedLines.map((line, index) => {
                  const departmentText = line.department || "부서 미지정";
                  const agreementOption = mapApprovalTypeToAgreementOption(
                    line.approval_type,
                  );
                  const isAgreementSelected = agreementOption === "agreement";

                  return (
                    <div
                      key={`${line.id}-${index}`}
                      className="flex items-center justify-between gap-3 p-3 rounded-xl border border-gray-200 bg-white"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex flex-col items-center gap-1 text-gray-400">
                          <button
                            type="button"
                            onClick={() => moveLine(index, -1)}
                            disabled={index === 0}
                            className="p-0.5 rounded hover:bg-gray-100 disabled:opacity-30"
                          >
                            <ChevronUp size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveLine(index, 1)}
                            disabled={index === selectedLines.length - 1}
                            className="p-0.5 rounded hover:bg-gray-100 disabled:opacity-30"
                          >
                            <ChevronDown size={14} />
                          </button>
                        </div>
                        <div className="w-9 h-9 rounded-full bg-blue-500 text-white font-semibold flex items-center justify-center shrink-0">
                          {index + 1}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {line.name || `사용자 ${line.id}`}
                          {line.position && (
                            <span className="ml-1 font-normal text-gray-500">
                              {line.position}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {departmentText}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <select
                          value={normalizeDecisionType(line.decision_type)}
                          onChange={(event) =>
                            handleDecisionTypeChange(index, event.target.value)
                          }
                          disabled={isAgreementSelected}
                          className={`px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg ${
                            isAgreementSelected
                              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                              : "bg-gray-50"
                          }`}
                        >
                          {APPROVAL_DECISION_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>

                        <select
                          value={agreementOption}
                          onChange={(event) =>
                            handleAgreementTypeChange(index, event.target.value)
                          }
                          className="px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg bg-gray-50"
                        >
                          {APPROVAL_AGREEMENT_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        onClick={() => removeApprover(line.id)}
                        className="p-1 text-gray-400 rounded-md hover:bg-red-50 hover:text-red-500"
                        title="결재자 제거"
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
            onClick={() => onSave(selectedLines)}
            className="px-4 py-2 text-sm text-white bg-blue-500 rounded-lg hover:bg-blue-600"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApproverSelectModal;
