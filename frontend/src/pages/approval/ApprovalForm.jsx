// src/pages/approval/ApprovalForm.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import {
  ArrowLeft,
  Save,
  Send,
  Plus,
  X,
  User,
  Users,
  UserPlus,
  Search,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Upload,
  Paperclip,
  Trash2,
  Pencil,
} from "lucide-react";

const ATTENDANCE_TEMPLATE_VALUE = "__attendance__";
const ATTENDANCE_TEMPLATE_TITLE = "근태계";
const ATTENDANCE_TYPE_OPTIONS = [
  "결근",
  "유급휴가",
  "경조",
  "병가",
  "공가",
  "기타",
];
const ATTENDANCE_REASON_OPTIONS = [
  "연차",
  "월차",
  "오전반차",
  "오후반차",
  "결혼",
  "사망",
  "회갑",
  "출산",
  "병가",
  "예비군",
  "민방위",
  "기타",
];

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

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const encodeMeta = (value) => encodeURIComponent(String(value ?? ""));

const decodeMeta = (value) => {
  try {
    return decodeURIComponent(value || "");
  } catch {
    return "";
  }
};

const getTodayDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const date = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${date}`;
};

const getAttendanceReasonOptions = () => ATTENDANCE_REASON_OPTIONS;

const getAttendanceDayCount = (startDate, endDate) => {
  if (!startDate || !endDate) return 1;
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 1;
  const diffDays = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
  return diffDays > 0 ? diffDays : 1;
};

const createDefaultAttendanceData = () => {
  const today = getTodayDateString();
  return {
    leaveType: "",
    leaveReason: "",
    startDate: today,
    endDate: today,
    remark: "",
  };
};

const normalizeAttendanceData = (rawData) => {
  const defaults = createDefaultAttendanceData();
  const leaveType = ATTENDANCE_TYPE_OPTIONS.includes(rawData?.leaveType)
    ? rawData.leaveType
    : "";
  const availableReasons = getAttendanceReasonOptions();
  const leaveReason = availableReasons.includes(rawData?.leaveReason)
    ? rawData.leaveReason
    : "";
  const startDate = rawData?.startDate || defaults.startDate;
  const endDate = rawData?.endDate || defaults.endDate;
  const normalizedEndDate = endDate < startDate ? startDate : endDate;

  return {
    leaveType,
    leaveReason,
    startDate,
    endDate: normalizedEndDate,
    remark: rawData?.remark || "",
  };
};

const parseAttendanceTemplateData = (content) => {
  if (
    !content ||
    typeof content !== "string" ||
    !content.includes("attendance-meta")
  ) {
    return null;
  }
  if (typeof DOMParser === "undefined") return null;

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, "text/html");
    const meta = doc.querySelector(".attendance-meta");
    if (!meta) return null;

    return normalizeAttendanceData({
      leaveType: decodeMeta(meta.getAttribute("data-leave-type")),
      leaveReason: decodeMeta(meta.getAttribute("data-leave-reason")),
      startDate: decodeMeta(meta.getAttribute("data-start-date")),
      endDate: decodeMeta(meta.getAttribute("data-end-date")),
      remark: decodeMeta(meta.getAttribute("data-remark")),
    });
  } catch (err) {
    console.error("Failed to parse attendance template content:", err);
    return null;
  }
};

const buildAttendanceTemplateContent = ({
  departmentName,
  userName,
  attendanceData,
}) => {
  const normalized = normalizeAttendanceData(attendanceData);
  const dayCount = getAttendanceDayCount(
    normalized.startDate,
    normalized.endDate,
  );
  const remarkHtml = normalized.remark
    ? escapeHtml(normalized.remark).replace(/\n/g, "<br />")
    : "";

  return `
<div class="attendance-template leading-relaxed text-gray-900">
  <div
    class="attendance-meta"
    style="display:none;"
    data-leave-type="${encodeMeta(normalized.leaveType)}"
    data-leave-reason="${encodeMeta(normalized.leaveReason)}"
    data-start-date="${encodeMeta(normalized.startDate)}"
    data-end-date="${encodeMeta(normalized.endDate)}"
    data-remark="${encodeMeta(normalized.remark)}"
  ></div>
  <h1 class="text-center text-4xl font-normal mb-8">근태계</h1>

  <table class="doc-table w-full table-fixed mb-3">
    <colgroup>
      <col style="width:12%;" />
      <col style="width:12%;" />
      <col style="width:15%;" />
      <col style="width:15%;" />
      <col style="width:23%;" />
      <col style="width:23%;" />
    </colgroup>
    <thead class="doc-thead">
      <tr>
        <th class="doc-th">부서</th>
        <th class="doc-th">성명</th>
        <th class="doc-th">근태구분</th>
        <th class="doc-th">근태사유</th>
        <th class="doc-th">기간</th>
        <th class="doc-th-end">비고 (상세사유 기재)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="doc-td text-left">${escapeHtml(departmentName || "미지정")}</td>
        <td class="doc-td text-left">${escapeHtml(userName || "사용자")}</td>
        <td class="doc-td text-left">${escapeHtml(normalized.leaveType || "선택")}</td>
        <td class="doc-td text-left">${escapeHtml(normalized.leaveReason || "선택")}</td>
        <td class="doc-td text-left">${escapeHtml(normalized.startDate)} ~ ${escapeHtml(normalized.endDate)} (${dayCount}일)</td>
        <td class="doc-td text-left">${remarkHtml}</td>
      </tr>
    </tbody>
  </table>

  <p class="mb-1">※ 본 근태계는 해당 부서를 경유, 관리부에 미리 제출해 주시기 바랍니다.</p>
  <p class="mb-1">※ 근태사유 중 증빙이 필요한 경우(예비군, 민방위 등)는 추후 관리부에 서류를 제출해 주시기 바랍니다.</p>
  <p class="mb-3">※ 사유는 다음에 제시하는 것 중 선택하여 기입하십시오.</p>

  <table class="doc-table attendance-guide-table w-full table-fixed mb-4">
    <colgroup>
      <col style="width:15%;" />
      <col style="width:85%;" />
    </colgroup>
    <thead class="doc-thead">
      <tr>
        <th class="doc-th">근태구분</th>
        <th class="doc-th-end">근태사유</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="doc-td">결근</td>
        <td class="doc-td text-left">무계 결근, 유계 결근</td>
      </tr>
      <tr>
        <td class="doc-td">유급휴가</td>
        <td class="doc-td text-left">연/월차 휴가, 생리휴가, 산전/후 휴가</td>
      </tr>
      <tr>
        <td class="doc-td">경조휴가</td>
        <td class="doc-td text-left" style="padding:0;">
          <table class="attendance-guide-subtable" style="width:100%; border-collapse:collapse;">
            <tbody>
              <tr>
                <td style="width:20%; border-right:1px solid #000; border-bottom:1px solid #000; padding:4px 6px; text-align:center;">결혼</td>
                <td style="border-bottom:1px solid #000; padding:4px 6px; text-align:left;">본인결혼(5일), 자녀(1일), 형제자매/배우자 형제자매(1일)</td>
              </tr>
              <tr>
                <td style="border-right:1px solid #000; border-bottom:1px solid #000; padding:4px 6px; text-align:center;">회갑/고희</td>
                <td style="border-bottom:1px solid #000; padding:4px 6px; text-align:left;">부모/배우자 부모(1일)</td>
              </tr>
              <tr>
                <td style="border-right:1px solid #000; border-bottom:1px solid #000; padding:4px 6px; text-align:center;">사망</td>
                <td style="border-bottom:1px solid #000; padding:4px 6px; text-align:left;">부모/배우자(5일), 배우자 부모(5일), 본인/배우자의 조부모(2일), 자녀(2일), 본인/배우자의 형제자매(3일)</td>
              </tr>
              <tr>
                <td style="border-right:1px solid #000; border-bottom:1px solid #000; padding:4px 6px; text-align:center;">배우자의 출산</td>
                <td style="border-bottom:1px solid #000; padding:4px 6px; text-align:left;">10일 (1회 분할 가능, 90일 이내 신청)</td>
              </tr>
              <tr>
                <td style="border-right:1px solid #000; padding:4px 6px; text-align:center;">기타</td>
                <td style="padding:4px 6px; text-align:left;"></td>
              </tr>
            </tbody>
          </table>
        </td>
      </tr>
      <tr>
        <td class="doc-td">병가</td>
        <td class="doc-td text-left">병가</td>
      </tr>
      <tr>
        <td class="doc-td">공가</td>
        <td class="doc-td text-left">예비군 훈련, 민방위 훈련</td>
      </tr>
    </tbody>
  </table>

  <p class="text-center">상기와 같이 근태계를 제출하오니 승인하여 주시기 바랍니다.</p>
</div>
`;
};

const APPROVAL_TEMPLATE_OPTIONS = [
  { value: ATTENDANCE_TEMPLATE_VALUE, label: "근태계" },
];

const isNumericTemplateId = (value) => /^\d+$/.test(String(value || ""));

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

const getApprovalStageLabel = (line = {}) => {
  if (normalizeApprovalType(line.approval_type) === "agreement") return "합의";
  if (normalizeDecisionType(line.decision_type) === "delegate") return "전결";
  return "결재";
};

const buildDefaultPresetName = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const date = String(now.getDate()).padStart(2, "0");
  const hour = String(now.getHours()).padStart(2, "0");
  const minute = String(now.getMinutes()).padStart(2, "0");
  return `결재선 ${year}-${month}-${date} ${hour}:${minute}`;
};

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

export default function ApprovalForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);

  // 폼 데이터
  const [formData, setFormData] = useState({
    template: "",
    title: "",
    content: "",
    preservation_period: 5,
  });
  const [approvalLines, setApprovalLines] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [existingAttachments, setExistingAttachments] = useState([]);
  const [users, setUsers] = useState([]);
  const [departmentOrderById, setDepartmentOrderById] = useState({});
  const [positionLevelById, setPositionLevelById] = useState({});
  const [savedApprovalLinePresets, setSavedApprovalLinePresets] = useState([]);
  const [presetLoading, setPresetLoading] = useState(false);
  const [presetSaving, setPresetSaving] = useState(false);
  const [presetUpdatingId, setPresetUpdatingId] = useState(null);
  const [presetDeletingId, setPresetDeletingId] = useState(null);
  const [attendanceData, setAttendanceData] = useState(() =>
    createDefaultAttendanceData(),
  );
  const [primaryMembership, setPrimaryMembership] = useState(null);

  const attendanceDepartmentName = getUserDepartmentName(user) || "미지정";
  const attendanceBaseName = getUserDisplayName(user) || "사용자";
  const attendancePositionName =
    getUserPositionName(user) || primaryMembership?.position_name || "";
  const attendanceUserName = attendancePositionName
    ? `${attendanceBaseName} ${attendancePositionName}`
    : attendanceBaseName;
  const attendanceReasonOptions = getAttendanceReasonOptions();
  const attendanceDayCount = getAttendanceDayCount(
    attendanceData.startDate,
    attendanceData.endDate,
  );

  const loadUsers = useCallback(async () => {
    try {
      const res = await api.get("core/users/", {
        params: { page_size: 1000 },
      });
      setUsers(res.data?.results ?? res.data ?? []);
    } catch (err) {
      console.error("Failed to load users:", err);
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
      console.error("Failed to load departments:", err);
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
        nextPositionLevelById[String(position.id)] = Number.isFinite(
          parsedLevel,
        )
          ? parsedLevel
          : Number.MAX_SAFE_INTEGER;
      });
      setPositionLevelById(nextPositionLevelById);
    } catch (err) {
      console.error("Failed to load positions:", err);
      setPositionLevelById({});
    }
  }, []);

  const loadApprovalLinePresets = useCallback(async () => {
    setPresetLoading(true);
    try {
      const res = await api.get("/approval/line-presets/");
      setSavedApprovalLinePresets(res.data?.results ?? res.data ?? []);
    } catch (err) {
      console.error("Failed to load approval line presets:", err);
      setSavedApprovalLinePresets([]);
    } finally {
      setPresetLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadPrimaryMembership = async () => {
      if (!user) {
        if (mounted) setPrimaryMembership(null);
        return;
      }

      try {
        const res = await api.get("core/membership/me/");
        const memberships = res.data?.results ?? res.data ?? [];
        const primary =
          memberships.find((membership) => membership.is_primary) ||
          memberships[0] ||
          null;
        if (mounted) {
          setPrimaryMembership(primary);
        }
      } catch (err) {
        if (mounted) {
          setPrimaryMembership(null);
        }
      }
    };

    loadPrimaryMembership();

    return () => {
      mounted = false;
    };
  }, [user]);

  useEffect(() => {
    loadUsers();
    loadDepartments();
    loadPositions();
    loadApprovalLinePresets();
  }, [loadUsers, loadDepartments, loadPositions, loadApprovalLinePresets]);

  useEffect(() => {
    if (!showUserModal) return;
    loadDepartments();
    loadPositions();
    loadApprovalLinePresets();
  }, [showUserModal, loadDepartments, loadPositions, loadApprovalLinePresets]);

  // 문서 로드 (수정 모드)
  useEffect(() => {
    if (!isEdit) return;

    const loadDocument = async () => {
      try {
        const res = await api.get(`/approval/documents/${id}/`);
        const doc = res.data;
        const parsedAttendanceData = parseAttendanceTemplateData(doc.content);
        const isAttendanceDoc = Boolean(parsedAttendanceData);

        if (isAttendanceDoc) {
          setAttendanceData(parsedAttendanceData);
        }

        setFormData({
          template: isAttendanceDoc
            ? ATTENDANCE_TEMPLATE_VALUE
            : doc.template
              ? String(doc.template)
              : "",
          title: doc.title,
          content: doc.content,
          preservation_period: doc.preservation_period || 5,
        });
        setApprovalLines(
          doc.approval_lines?.map((line) => ({
            id: line.approver,
            name: line.approver_name,
            position: line.approver_position,
            department: line.approver_department,
            company: "",
            approval_type: normalizeApprovalType(line.approval_type),
            decision_type: "approval",
          })) || [],
        );
        setExistingAttachments(doc.attachments || []);
      } catch (err) {
        console.error("Failed to load document:", err);
        alert("문서를 불러오는데 실패했습니다.");
        navigate("/approval");
      } finally {
        setLoading(false);
      }
    };
    loadDocument();
  }, [id, isEdit, navigate]);

  const handleSaveApproverSelection = (selectedLines) => {
    setApprovalLines(
      selectedLines.map((line) => {
        const targetUser = users.find(
          (candidate) => String(candidate.id) === String(line.id),
        );

        if (!targetUser) {
          return {
            id: line.id,
            name: line.name || `사용자 ${line.id}`,
            position: line.position || "",
            department: line.department || "",
            company: line.company || "",
            approval_type: normalizeApprovalType(line.approval_type),
            decision_type: normalizeDecisionType(line.decision_type),
          };
        }

        return {
          id: targetUser.id,
          name: getUserDisplayName(targetUser) || targetUser.username,
          position: getUserPositionName(targetUser) || line.position || "",
          department:
            getUserDepartmentName(targetUser) || line.department || "",
          company: getUserCompanyName(targetUser) || line.company || "",
          approval_type: normalizeApprovalType(line.approval_type),
          decision_type: normalizeDecisionType(line.decision_type),
        };
      }),
    );
    setShowUserModal(false);
  };

  const handleSaveApprovalLinePreset = async (selectedLines) => {
    if (selectedLines.length === 0) {
      alert("저장할 결재선을 먼저 구성해주세요.");
      return;
    }

    const defaultName = buildDefaultPresetName();
    const rawName = window.prompt(
      "저장할 결재선 이름을 입력해주세요.",
      defaultName,
    );

    if (rawName === null) return;

    const name = rawName.trim();
    if (!name) {
      alert("결재선 이름을 입력해주세요.");
      return;
    }

    setPresetSaving(true);
    try {
      await api.post("/approval/line-presets/", {
        name,
        lines: selectedLines.map((line, index) => ({
          approver: line.id,
          order: index,
          approval_type: normalizeApprovalType(line.approval_type),
          decision_type: normalizeDecisionType(line.decision_type),
        })),
      });
      await loadApprovalLinePresets();
      alert("결재선이 저장되었습니다.");
    } catch (err) {
      console.error("Failed to save approval line preset:", err);
      alert("결재선 저장에 실패했습니다.");
    } finally {
      setPresetSaving(false);
    }
  };

  const handleUpdateApprovalLinePreset = async (
    presetId,
    { name, lines } = {},
  ) => {
    if (!presetId) return false;

    const trimmedName = (name || "").trim();
    if (!trimmedName) {
      alert("결재선 이름을 입력해주세요.");
      return false;
    }

    if (!Array.isArray(lines) || lines.length === 0) {
      alert("저장할 결재선을 먼저 구성해주세요.");
      return false;
    }

    setPresetUpdatingId(presetId);
    try {
      await api.patch(`/approval/line-presets/${presetId}/`, {
        name: trimmedName,
        lines: lines.map((line, index) => ({
          approver: line.id,
          order: index,
          approval_type: normalizeApprovalType(line.approval_type),
          decision_type: normalizeDecisionType(line.decision_type),
        })),
      });
      await loadApprovalLinePresets();
      alert("결재선이 수정되었습니다.");
      return true;
    } catch (err) {
      console.error("Failed to update approval line preset:", err);
      alert("결재선 수정에 실패했습니다.");
      return false;
    } finally {
      setPresetUpdatingId(null);
    }
  };

  const handleDeleteApprovalLinePreset = async (presetId) => {
    if (!window.confirm("저장된 결재선을 삭제하시겠습니까?")) return;

    setPresetDeletingId(presetId);
    try {
      await api.delete(`/approval/line-presets/${presetId}/`);
      await loadApprovalLinePresets();
    } catch (err) {
      console.error("Failed to delete approval line preset:", err);
      alert("결재선 삭제에 실패했습니다.");
    } finally {
      setPresetDeletingId(null);
    }
  };

  // 파일 선택
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setAttachments((prev) => [...prev, ...files]);
    e.target.value = "";
  };

  // 파일 제거
  const handleRemoveFile = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // 기존 첨부파일 삭제
  const handleRemoveExistingAttachment = async (attachment) => {
    if (!window.confirm("첨부파일을 삭제하시겠습니까?")) return;
    try {
      await api.delete(
        `/approval/documents/${id}/attachment/${attachment.id}/`,
      );
      setExistingAttachments((prev) =>
        prev.filter((a) => a.id !== attachment.id),
      );
    } catch (err) {
      console.error("Failed to delete attachment:", err);
      alert("첨부파일 삭제에 실패했습니다.");
    }
  };

  const handleAttendanceTypeChange = (nextLeaveType) => {
    setAttendanceData((prev) => {
      const nextReasonOptions = getAttendanceReasonOptions();
      const nextLeaveReason = nextReasonOptions.includes(prev.leaveReason)
        ? prev.leaveReason
        : "";
      return {
        ...prev,
        leaveType: nextLeaveType,
        leaveReason: nextLeaveReason,
      };
    });
  };

  const handleAttendanceReasonChange = (nextLeaveReason) => {
    setAttendanceData((prev) => ({
      ...prev,
      leaveReason: nextLeaveReason,
    }));
  };

  const handleAttendanceStartDateChange = (nextStartDate) => {
    setAttendanceData((prev) => {
      const safeStartDate = nextStartDate || prev.startDate;
      const safeEndDate =
        prev.endDate < safeStartDate ? safeStartDate : prev.endDate;
      return {
        ...prev,
        startDate: safeStartDate,
        endDate: safeEndDate,
      };
    });
  };

  const handleAttendanceEndDateChange = (nextEndDate) => {
    setAttendanceData((prev) => {
      const safeEndDate =
        !nextEndDate || nextEndDate < prev.startDate
          ? prev.startDate
          : nextEndDate;
      return {
        ...prev,
        endDate: safeEndDate,
      };
    });
  };

  const handleAttendanceRemarkChange = (nextRemark) => {
    setAttendanceData((prev) => ({
      ...prev,
      remark: nextRemark,
    }));
  };

  // 저장
  const handleSave = async (submit = false) => {
    if (!formData.title.trim()) {
      alert("제목을 입력해주세요.");
      return;
    }

    if (submit && approvalLines.length === 0) {
      alert("결재선을 설정해주세요.");
      return;
    }

    setSaving(true);
    try {
      const contentToSave = isAttendanceTemplate
        ? buildAttendanceTemplateContent({
            departmentName: attendanceDepartmentName,
            userName: attendanceUserName,
            attendanceData,
          })
        : formData.content;

      const data = new FormData();
      data.append("title", formData.title);
      data.append("content", contentToSave);
      data.append("preservation_period", formData.preservation_period);
      if (isNumericTemplateId(formData.template)) {
        data.append("template", formData.template);
      }

      // 결재선 추가
      data.append(
        "approval_lines",
        JSON.stringify(
          approvalLines.map((line) => ({
            approver: line.id,
            approval_type: line.approval_type,
          })),
        ),
      );

      // 새 첨부파일 추가
      attachments.forEach((file) => {
        data.append("attachments", file);
      });

      let docId = id;

      if (isEdit) {
        await api.patch(`/approval/documents/${id}/`, data, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        const res = await api.post("/approval/documents/", data, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        docId = res.data.id;
      }

      // 제출
      if (submit) {
        await api.post(`/approval/documents/${docId}/submit/`);
        alert("문서가 제출되었습니다.");
        navigate("/approval");
      } else {
        alert("임시저장되었습니다.");
        navigate(`/approval/${docId}`);
      }
    } catch (err) {
      console.error("Save failed:", err);
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleTemplateChange = (templateValue) => {
    if (templateValue === ATTENDANCE_TEMPLATE_VALUE) {
      const nextContent = buildAttendanceTemplateContent({
        departmentName: attendanceDepartmentName,
        userName: attendanceUserName,
        attendanceData,
      });
      setFormData((prev) => ({
        ...prev,
        template: templateValue,
        title: ATTENDANCE_TEMPLATE_TITLE,
        content: nextContent,
      }));
      return;
    }

    setFormData((prev) => ({ ...prev, template: templateValue }));
  };

  const isAttendanceTemplate = formData.template === ATTENDANCE_TEMPLATE_VALUE;

  useEffect(() => {
    if (!isAttendanceTemplate) return;
    const nextContent = buildAttendanceTemplateContent({
      departmentName: attendanceDepartmentName,
      userName: attendanceUserName,
      attendanceData,
    });
    setFormData((prev) =>
      prev.content === nextContent ? prev : { ...prev, content: nextContent },
    );
  }, [
    isAttendanceTemplate,
    attendanceDepartmentName,
    attendanceUserName,
    attendanceData,
  ]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-sky-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? "문서 수정" : "문서 작성"}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSave(false)}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <Save size={18} />
            임시저장
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors disabled:opacity-50"
          >
            <Send size={18} />
            제출
          </button>
        </div>
      </div>

      {/* 기본 정보 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h3 className="text-sm font-semibold text-gray-700">기본 정보</h3>

        {/* 양식 선택 */}
        <div>
          <label className="block text-sm text-gray-600 mb-1">결재 양식</label>
          <select
            value={formData.template}
            onChange={(e) => handleTemplateChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
          >
            <option value="">양식 선택</option>
            {APPROVAL_TEMPLATE_OPTIONS.map((templateOption) => (
              <option key={templateOption.value} value={templateOption.value}>
                {templateOption.label}
              </option>
            ))}
            {isNumericTemplateId(formData.template) && (
              <option value={formData.template}>
                기존 양식 (ID: {formData.template})
              </option>
            )}
          </select>
        </div>

        {/* 제목 */}
        <div>
          <label className="block text-sm text-gray-600 mb-1">
            제목 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, title: e.target.value }))
            }
            placeholder="문서 제목을 입력하세요"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
          />
        </div>

        {/* 내용 */}
        <div>
          <label className="block text-sm text-gray-600 mb-1">내용</label>
          {isAttendanceTemplate ? (
            <div className="bg-transparent p-0">
              <div className="attendance-template max-h-[560px] overflow-auto leading-relaxed text-gray-900">
                <h1 className="mb-8 text-center text-4xl font-normal">
                  근태계
                </h1>

                <table className="doc-table mb-3 w-full table-fixed">
                  <colgroup>
                    <col style={{ width: "12%" }} />
                    <col style={{ width: "12%" }} />
                    <col style={{ width: "15%" }} />
                    <col style={{ width: "15%" }} />
                    <col style={{ width: "23%" }} />
                    <col style={{ width: "23%" }} />
                  </colgroup>
                  <thead className="doc-thead">
                    <tr>
                      <th className="doc-th">부서</th>
                      <th className="doc-th">성명</th>
                      <th className="doc-th">근태구분</th>
                      <th className="doc-th">근태사유</th>
                      <th className="doc-th">기간</th>
                      <th className="doc-th-end">비고 (상세사유 기재)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="doc-td text-center">
                        {attendanceDepartmentName}
                      </td>
                      <td className="doc-td text-center">
                        {attendanceUserName}
                      </td>
                      <td className="doc-td">
                        <select
                          value={attendanceData.leaveType}
                          onChange={(e) =>
                            handleAttendanceTypeChange(e.target.value)
                          }
                          className="input-sm bg-white"
                          style={{ width: "110px", minWidth: "110px" }}
                        >
                          <option value="">선택</option>
                          {ATTENDANCE_TYPE_OPTIONS.map((typeOption) => (
                            <option key={typeOption} value={typeOption}>
                              {typeOption}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="doc-td">
                        <select
                          value={attendanceData.leaveReason}
                          onChange={(e) =>
                            handleAttendanceReasonChange(e.target.value)
                          }
                          className="input-sm bg-white"
                          style={{ width: "110px", minWidth: "110px" }}
                        >
                          <option value="">선택</option>
                          {attendanceReasonOptions.map((reasonOption) => (
                            <option key={reasonOption} value={reasonOption}>
                              {reasonOption}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="doc-td text-center whitespace-nowrap">
                        <div className="flex w-full items-center justify-center gap-1 text-[11px]">
                          <input
                            type="date"
                            value={attendanceData.startDate}
                            onChange={(e) =>
                              handleAttendanceStartDateChange(e.target.value)
                            }
                            className="input-sm !w-auto bg-white"
                          />
                          <span>~</span>
                          <input
                            type="date"
                            value={attendanceData.endDate}
                            min={attendanceData.startDate}
                            onChange={(e) =>
                              handleAttendanceEndDateChange(e.target.value)
                            }
                            className="input-sm !w-auto bg-white"
                          />
                          <span>({attendanceDayCount}일)</span>
                        </div>
                      </td>
                      <td className="doc-td text-left">
                        <input
                          type="text"
                          value={attendanceData.remark}
                          onChange={(e) =>
                            handleAttendanceRemarkChange(e.target.value)
                          }
                          className="input-sm bg-white"
                          placeholder="상세사유를 입력하세요"
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>

                <p className="mb-1">
                  ※ 본 근태계는 해당 부서를 경유, 관리부에 미리 제출해 주시기
                  바랍니다.
                </p>
                <p className="mb-1">
                  ※ 근태사유 중 증빙이 필요한 경우(예비군, 민방위 등)는 추후
                  관리부에 서류를 제출해 주시기 바랍니다.
                </p>
                <p className="mb-3">
                  ※ 사유는 다음에 제시하는 것 중 선택하여 기입하십시오.
                </p>

                <table className="doc-table attendance-guide-table mb-4 w-full table-fixed">
                  <colgroup>
                    <col style={{ width: "15%" }} />
                    <col style={{ width: "85%" }} />
                  </colgroup>
                  <thead className="doc-thead">
                    <tr>
                      <th className="doc-th">근태구분</th>
                      <th className="doc-th-end">근태사유</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="doc-td">결근</td>
                      <td className="doc-td text-left">무계 결근, 유계 결근</td>
                    </tr>
                    <tr>
                      <td className="doc-td">유급휴가</td>
                      <td className="doc-td text-left">
                        연/월차 휴가, 생리휴가, 산전/후 휴가
                      </td>
                    </tr>
                    <tr>
                      <td className="doc-td">경조휴가</td>
                      <td className="doc-td text-left" style={{ padding: 0 }}>
                        <table
                          className="attendance-guide-subtable"
                          style={{
                            width: "100%",
                            borderCollapse: "collapse",
                          }}
                        >
                          <tbody>
                            <tr>
                              <td
                                style={{
                                  width: "15%",
                                  borderRight: "1px solid #000",
                                  borderBottom: "1px solid #000",
                                  padding: "4px 6px",
                                  textAlign: "center",
                                }}
                              >
                                결혼
                              </td>
                              <td
                                style={{
                                  borderBottom: "1px solid #000",
                                  padding: "4px 6px",
                                  textAlign: "left",
                                }}
                              >
                                본인결혼(5일), 자녀(1일), 형제자매/배우자
                                형제자매(1일)
                              </td>
                            </tr>
                            <tr>
                              <td
                                style={{
                                  borderRight: "1px solid #000",
                                  borderBottom: "1px solid #000",
                                  padding: "4px 6px",
                                  textAlign: "center",
                                }}
                              >
                                회갑/고희
                              </td>
                              <td
                                style={{
                                  borderBottom: "1px solid #000",
                                  padding: "4px 6px",
                                  textAlign: "left",
                                }}
                              >
                                부모/배우자 부모(1일)
                              </td>
                            </tr>
                            <tr>
                              <td
                                style={{
                                  borderRight: "1px solid #000",
                                  borderBottom: "1px solid #000",
                                  padding: "4px 6px",
                                  textAlign: "center",
                                }}
                              >
                                사망
                              </td>
                              <td
                                style={{
                                  borderBottom: "1px solid #000",
                                  padding: "4px 6px",
                                  textAlign: "left",
                                }}
                              >
                                부모/배우자(5일), 배우자 부모(5일),
                                본인/배우자의 조부모(2일), 자녀(2일),
                                본인/배우자의 형제자매(3일)
                              </td>
                            </tr>
                            <tr>
                              <td
                                style={{
                                  borderRight: "1px solid #000",
                                  borderBottom: "1px solid #000",
                                  padding: "4px 6px",
                                  textAlign: "center",
                                }}
                              >
                                배우자의 출산
                              </td>
                              <td
                                style={{
                                  borderBottom: "1px solid #000",
                                  padding: "4px 6px",
                                  textAlign: "left",
                                }}
                              >
                                10일 (1회 분할 가능, 90일 이내 신청)
                              </td>
                            </tr>
                            <tr>
                              <td
                                style={{
                                  borderRight: "1px solid #000",
                                  padding: "4px 6px",
                                  textAlign: "center",
                                }}
                              >
                                기타
                              </td>
                              <td
                                style={{
                                  padding: "4px 6px",
                                  textAlign: "left",
                                }}
                              />
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td className="doc-td">병가</td>
                      <td className="doc-td text-left">병가</td>
                    </tr>
                    <tr>
                      <td className="doc-td">공가</td>
                      <td className="doc-td text-left">
                        예비군 훈련, 민방위 훈련
                      </td>
                    </tr>
                  </tbody>
                </table>

                <p className="text-center">
                  상기와 같이 근태계를 제출하오니 승인하여 주시기 바랍니다.
                </p>
              </div>
            </div>
          ) : (
            <textarea
              value={formData.content}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, content: e.target.value }))
              }
              placeholder="문서 내용을 입력하세요"
              rows={10}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none resize-none"
            />
          )}
        </div>
      </div>

      {/* 결재선 설정 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">
            결재선 설정 <span className="text-red-500">*</span>
          </h3>
          <button
            onClick={() => setShowUserModal(true)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-sky-600 bg-sky-50 rounded-lg hover:bg-sky-100 transition-colors"
          >
            <Plus size={16} />
            결재선 관리
          </button>
        </div>
        <p className="text-xs text-gray-500">
          이 영역은 읽기 전용입니다. 결재선 수정은 결재선 관리에서만 가능합니다.
        </p>

        {approvalLines.length === 0 ? (
          <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
            <User size={32} className="mx-auto mb-2 text-gray-300" />
            <p>결재자를 추가해주세요</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="inline-flex border border-gray-300 rounded-sm overflow-hidden">
              {approvalLines.map((line, idx) => (
                <div
                  key={`${line.id || "line"}-${idx}`}
                  className="w-32 shrink-0 border-r border-gray-300 last:border-r-0"
                >
                  <div className="h-8 bg-gray-200 border-b border-gray-300 flex items-center justify-center px-2">
                    <p className="text-sm text-gray-800 whitespace-nowrap">
                      ({idx + 1}) {getApprovalStageLabel(line)}
                    </p>
                  </div>
                  <div className="h-20 bg-white flex items-center justify-center px-2">
                    <p className="text-xl font-medium text-gray-900 whitespace-nowrap overflow-hidden text-ellipsis">
                      {line.name || `사용자 ${line.id}`}
                      {line.position ? ` ${line.position}` : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 첨부파일 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Paperclip size={16} />
            첨부파일
          </h3>
          <label className="flex items-center gap-1 px-3 py-1.5 text-sm text-sky-600 bg-sky-50 rounded-lg hover:bg-sky-100 transition-colors cursor-pointer">
            <Upload size={16} />
            파일 선택
            <input
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
          </label>
        </div>

        {/* 기존 첨부파일 */}
        {existingAttachments.length > 0 && (
          <div className="space-y-2">
            {existingAttachments.map((att) => (
              <div
                key={att.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Paperclip size={16} className="text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {att.filename}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(att.file_size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveExistingAttachment(att)}
                  className="p-1 text-gray-400 hover:text-red-500"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* 새 첨부파일 */}
        {attachments.length > 0 && (
          <div className="space-y-2">
            {attachments.map((file, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 bg-blue-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Paperclip size={16} className="text-blue-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(file.size / 1024).toFixed(1)} KB (새 파일)
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveFile(idx)}
                  className="p-1 text-gray-400 hover:text-red-500"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        )}

        {existingAttachments.length === 0 && attachments.length === 0 && (
          <div className="text-center py-6 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
            <Paperclip size={24} className="mx-auto mb-2 text-gray-300" />
            <p className="text-sm">첨부파일이 없습니다</p>
          </div>
        )}
      </div>

      {/* 결재선 관리 모달 */}
      <ApproverSelectModal
        isOpen={showUserModal}
        onClose={() => setShowUserModal(false)}
        users={users}
        departmentOrderById={departmentOrderById}
        positionLevelById={positionLevelById}
        initialSelectedLines={approvalLines}
        savedPresets={savedApprovalLinePresets}
        presetLoading={presetLoading}
        presetSaving={presetSaving}
        presetUpdatingId={presetUpdatingId}
        presetDeletingId={presetDeletingId}
        onSavePreset={handleSaveApprovalLinePreset}
        onUpdatePreset={handleUpdateApprovalLinePreset}
        onDeletePreset={handleDeleteApprovalLinePreset}
        onSave={handleSaveApproverSelection}
      />
    </div>
  );
}
