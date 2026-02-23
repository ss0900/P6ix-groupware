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
  Search,
  GripVertical,
  Upload,
  Paperclip,
  Trash2,
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

const getUserPositionName = (user) =>
  user?.primary_membership?.position_name ||
  user?.position?.name ||
  user?.position_name ||
  "";

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

// 사용자 검색 모달
const UserSearchModal = ({ isOpen, onClose, onSelect, selectedUsers }) => {
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const loadUsers = useCallback(async () => {
    if (!isOpen) return;
    setLoading(true);
    try {
      const params = searchQuery ? { search: searchQuery } : {};
      const res = await api.get("/core/users/", { params });
      setUsers(res.data?.results ?? res.data ?? []);
    } catch (err) {
      console.error("Failed to load users:", err);
    } finally {
      setLoading(false);
    }
  }, [isOpen, searchQuery]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl w-full max-w-md max-h-[80vh] flex flex-col shadow-xl">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">결재자 선택</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="이름, 부서로 검색..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-sky-500 border-t-transparent"></div>
            </div>
          ) : users.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              사용자를 찾을 수 없습니다.
            </p>
          ) : (
            <div className="space-y-2">
              {users.map((user) => {
                const isSelected = selectedUsers.some((u) => u.id === user.id);
                const fullName =
                  `${user.last_name || ""}${user.first_name || ""}`.trim() ||
                  user.username;
                const position = user.primary_membership?.position_name || "";
                const department =
                  user.primary_membership?.department_name || "";

                return (
                  <button
                    key={user.id}
                    onClick={() => !isSelected && onSelect(user)}
                    disabled={isSelected}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                      isSelected
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "hover:bg-sky-50 cursor-pointer"
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <User size={20} className="text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {fullName}
                        {position && (
                          <span className="text-gray-500 ml-1">{position}</span>
                        )}
                      </p>
                      {department && (
                        <p className="text-xs text-gray-500 truncate">
                          {department}
                        </p>
                      )}
                    </div>
                    {isSelected && (
                      <span className="text-xs text-gray-400">선택됨</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
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
            approval_type: line.approval_type,
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

  // 결재자 추가
  const handleAddApprover = (user) => {
    const fullName =
      `${user.last_name || ""}${user.first_name || ""}`.trim() || user.username;
    setApprovalLines((prev) => [
      ...prev,
      {
        id: user.id,
        name: fullName,
        position: user.primary_membership?.position_name || "",
        department: user.primary_membership?.department_name || "",
        approval_type: "approval",
      },
    ]);
    setShowUserModal(false);
  };

  // 결재자 제거
  const handleRemoveApprover = (index) => {
    setApprovalLines((prev) => prev.filter((_, i) => i !== index));
  };

  // 결재 유형 변경
  const handleTypeChange = (index, type) => {
    setApprovalLines((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, approval_type: type } : item,
      ),
    );
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
            결재자 추가
          </button>
        </div>

        {approvalLines.length === 0 ? (
          <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
            <User size={32} className="mx-auto mb-2 text-gray-300" />
            <p>결재자를 추가해주세요</p>
          </div>
        ) : (
          <div className="space-y-2">
            {approvalLines.map((line, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
              >
                <GripVertical size={16} className="text-gray-400 cursor-grab" />
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                  <User size={16} className="text-gray-500" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">
                    {idx + 1}. {line.name}
                    {line.position && (
                      <span className="text-gray-500 ml-1">
                        {line.position}
                      </span>
                    )}
                  </p>
                  {line.department && (
                    <p className="text-xs text-gray-500">{line.department}</p>
                  )}
                </div>
                <select
                  value={line.approval_type}
                  onChange={(e) => handleTypeChange(idx, e.target.value)}
                  className="px-2 py-1 text-sm border border-gray-300 rounded-lg"
                >
                  <option value="approval">결재</option>
                  <option value="agreement">합의</option>
                  <option value="reference">참조</option>
                </select>
                <button
                  onClick={() => handleRemoveApprover(idx)}
                  className="p-1 text-gray-400 hover:text-red-500"
                >
                  <X size={18} />
                </button>
              </div>
            ))}
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

      {/* 사용자 검색 모달 */}
      <UserSearchModal
        isOpen={showUserModal}
        onClose={() => setShowUserModal(false)}
        onSelect={handleAddApprover}
        selectedUsers={approvalLines}
      />
    </div>
  );
}
