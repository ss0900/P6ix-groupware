// src/pages/approval/ApprovalForm.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/axios";
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
const ATTENDANCE_TEMPLATE_CONTENT = `
<div style="font-family:'Malgun Gothic','Apple SD Gothic Neo',sans-serif; font-size:14px; line-height:1.6; color:#111827;">
  <h1 style="text-align:center; font-size:32px; margin:0 0 18px;">근태계</h1>

  <table style="width:100%; border-collapse:collapse; table-layout:fixed; margin-bottom:12px;">
    <thead>
      <tr>
        <th style="border:1px solid #9ca3af; padding:8px; background:#f3f4f6;">부서</th>
        <th style="border:1px solid #9ca3af; padding:8px; background:#f3f4f6;">성명</th>
        <th style="border:1px solid #9ca3af; padding:8px; background:#f3f4f6;">근태구분</th>
        <th style="border:1px solid #9ca3af; padding:8px; background:#f3f4f6;">근태사유</th>
        <th style="border:1px solid #9ca3af; padding:8px; background:#f3f4f6;">기간</th>
        <th style="border:1px solid #9ca3af; padding:8px; background:#f3f4f6;">비고 (상세사유 기재)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="border:1px solid #9ca3af; padding:8px;">전략사업본부</td>
        <td style="border:1px solid #9ca3af; padding:8px;">박수연 주임</td>
        <td style="border:1px solid #9ca3af; padding:8px;">
          <select disabled style="width:100%; border:1px solid #d1d5db; border-radius:4px; padding:4px 6px;">
            <option selected>선택</option>
          </select>
        </td>
        <td style="border:1px solid #9ca3af; padding:8px;">
          <select disabled style="width:100%; border:1px solid #d1d5db; border-radius:4px; padding:4px 6px;">
            <option selected>선택</option>
          </select>
        </td>
        <td style="border:1px solid #9ca3af; padding:8px; white-space:nowrap;">
          <input type="date" value="2026-02-23" disabled style="border:1px solid #d1d5db; border-radius:4px; padding:4px 6px;" />
          ~
          <input type="date" value="2026-02-23" disabled style="border:1px solid #d1d5db; border-radius:4px; padding:4px 6px;" />
          (1일)
        </td>
        <td style="border:1px solid #9ca3af; padding:8px;"></td>
      </tr>
    </tbody>
  </table>

  <p style="margin:4px 0;">※ 본 근태계는 해당 부서를 경유, 관리부에 미리 제출해 주시기 바랍니다.</p>
  <p style="margin:4px 0;">※ 근태사유 중 증빙이 필요한 경우(예비군, 민방위 등)는 추후 관리부에 서류를 제출해 주시기 바랍니다.</p>
  <p style="margin:4px 0 12px 0;">※ 사유는 다음에 제시하는 것 중 선택하여 기입하십시오.</p>

  <table style="width:100%; border-collapse:collapse; table-layout:fixed; margin-bottom:14px;">
    <thead>
      <tr>
        <th style="width:26%; border:1px solid #9ca3af; padding:8px; background:#f3f4f6;">근태구분</th>
        <th style="border:1px solid #9ca3af; padding:8px; background:#f3f4f6;">근태사유</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="border:1px solid #9ca3af; padding:8px; font-weight:600;">결근</td>
        <td style="border:1px solid #9ca3af; padding:8px;">무계 결근, 유계 결근</td>
      </tr>
      <tr>
        <td style="border:1px solid #9ca3af; padding:8px; font-weight:600;">유급휴가</td>
        <td style="border:1px solid #9ca3af; padding:8px;">연/월차 휴가, 생리휴가, 산전/후 휴가</td>
      </tr>
      <tr>
        <td style="border:1px solid #9ca3af; padding:8px; font-weight:600;">경조휴가</td>
        <td style="border:1px solid #9ca3af; padding:8px;">
          결혼: 본인결혼(5일), 자녀(1일), 형제자매/배우자 형제자매(1일)<br/>
          회갑/고희: 부모/배우자 부모(1일)<br/>
          사망: 부모/배우자(5일), 배우자 부모(5일), 본인/배우자의 조부모(2일), 자녀(2일), 본인/배우자의 형제자매(3일)<br/>
          배우자의 출산: 10일 (1회 분할 가능, 90일 이내 신청)<br/>
          기타:
        </td>
      </tr>
      <tr>
        <td style="border:1px solid #9ca3af; padding:8px; font-weight:600;">병가</td>
        <td style="border:1px solid #9ca3af; padding:8px;">병가</td>
      </tr>
      <tr>
        <td style="border:1px solid #9ca3af; padding:8px; font-weight:600;">공가</td>
        <td style="border:1px solid #9ca3af; padding:8px;">예비군 훈련, 민방위 훈련</td>
      </tr>
    </tbody>
  </table>

  <p style="text-align:center; margin:0;">상기와 같이 근태계를 제출하오니 승인하여 주시기 바랍니다.</p>
</div>
`;

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

  // 문서 로드 (수정 모드)
  useEffect(() => {
    if (!isEdit) return;

    const loadDocument = async () => {
      try {
        const res = await api.get(`/approval/documents/${id}/`);
        const doc = res.data;
        setFormData({
          template: doc.template ? String(doc.template) : "",
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
      const data = new FormData();
      data.append("title", formData.title);
      data.append("content", formData.content);
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
      setFormData((prev) => ({
        ...prev,
        template: templateValue,
        title: ATTENDANCE_TEMPLATE_TITLE,
        content: ATTENDANCE_TEMPLATE_CONTENT,
      }));
      return;
    }

    setFormData((prev) => ({ ...prev, template: templateValue }));
  };

  const isAttendanceTemplate = formData.template === ATTENDANCE_TEMPLATE_VALUE;

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
          <label className="block text-sm text-gray-600 mb-1">
            결재 양식
          </label>
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
            <div className="rounded-lg border border-gray-300 bg-white p-4">
              <div
                className="max-h-[560px] overflow-auto"
                dangerouslySetInnerHTML={{ __html: formData.content }}
              />
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
