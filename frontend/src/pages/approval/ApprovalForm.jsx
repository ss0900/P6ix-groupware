// src/pages/approval/ApprovalForm.jsx
import React, { useEffect, useState } from "react";
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
  GripVertical
} from "lucide-react";

// 사용자 검색 모달
const UserSearchModal = ({ isOpen, onClose, onSelect, selectedUsers }) => {
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    
    const loadUsers = async () => {
      setLoading(true);
      try {
        const res = await api.get("core/users/");
        setUsers(res.data?.results ?? res.data ?? []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadUsers();
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredUsers = users.filter(
    (u) =>
      !selectedUsers.includes(u.id) &&
      (`${u.last_name}${u.first_name}`.includes(searchQuery) ||
        u.username.includes(searchQuery))
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">결재자 선택</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={20} />
          </button>
        </div>

        {/* 검색 */}
        <div className="relative mb-4">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="이름 또는 아이디 검색..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
          />
        </div>

        {/* 사용자 목록 */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <p className="text-center py-8 text-gray-500">검색 결과가 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {filteredUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => onSelect(user)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-blue-50 rounded-lg text-left transition-colors"
                >
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <User size={20} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">{user.last_name}{user.first_name}</p>
                    <p className="text-sm text-gray-500">
                      {user.department?.name || ""} {user.position?.name || ""}
                    </p>
                  </div>
                </button>
              ))}
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

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [userModalOpen, setUserModalOpen] = useState(false);

  // 폼 데이터
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    priority: "normal",
    template: "",
  });

  // 결재선
  const [approvalLines, setApprovalLines] = useState([]);

  // 템플릿 로드
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("approval/templates/");
        setTemplates(res.data?.results ?? res.data ?? []);
      } catch (err) {
        console.error(err);
      }
    })();
  }, []);

  // 편집 모드: 문서 정보 로드
  useEffect(() => {
    if (!isEdit) return;

    setLoading(true);
    (async () => {
      try {
        const res = await api.get(`approval/documents/${id}/`);
        const doc = res.data;
        setFormData({
          title: doc.title || "",
          content: doc.content || "",
          priority: doc.priority || "normal",
          template: doc.template || "",
        });
        setApprovalLines(
          doc.approval_lines?.map((line) => ({
            id: line.approver,
            name: line.approver_name,
            position: line.approver_position,
            type: line.approval_type,
          })) || []
        );
      } catch (err) {
        console.error(err);
        alert("문서를 불러올 수 없습니다.");
        navigate("/approval");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isEdit, navigate]);

  // 결재자 추가
  const handleAddApprover = (user) => {
    setApprovalLines([
      ...approvalLines,
      {
        id: user.id,
        name: `${user.last_name}${user.first_name}`,
        position: user.position?.name || "",
        type: "approval",
      },
    ]);
    setUserModalOpen(false);
  };

  // 결재자 제거
  const handleRemoveApprover = (index) => {
    setApprovalLines(approvalLines.filter((_, i) => i !== index));
  };

  // 저장 (임시저장)
  const handleSave = async (submit = false) => {
    if (!formData.title.trim()) {
      alert("제목을 입력해주세요.");
      return;
    }

    if (submit && approvalLines.length === 0) {
      alert("결재자를 1명 이상 추가해주세요.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        approval_lines: approvalLines.map((line, idx) => ({
          approver: line.id,
          approval_type: line.type,
        })),
      };

      let docId = id;
      if (isEdit) {
        await api.patch(`approval/documents/${id}/`, payload);
      } else {
        const res = await api.post("approval/documents/", payload);
        docId = res.data.id;
      }

      if (submit) {
        await api.post(`approval/documents/${docId}/submit/`);
        alert("문서가 제출되었습니다.");
      } else {
        alert("임시저장되었습니다.");
      }

      navigate("/approval");
    } catch (err) {
      console.error(err);
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/approval")}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEdit ? "문서 수정" : "새 기안"}
        </h1>
      </div>

      {/* 폼 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
        {/* 기본 정보 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">제목 *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="문서 제목을 입력하세요"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">양식</label>
            <select
              value={formData.template}
              onChange={(e) => setFormData({ ...formData, template: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">일반 문서</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">우선순위</label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="normal">일반</option>
              <option value="important">중요</option>
              <option value="urgent">긴급</option>
            </select>
          </div>
        </div>

        {/* 내용 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">내용</label>
          <textarea
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            placeholder="문서 내용을 입력하세요"
            rows={10}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
          />
        </div>

        {/* 결재선 */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-gray-700">결재선</label>
            <button
              onClick={() => setUserModalOpen(true)}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg"
            >
              <Plus size={16} />
              결재자 추가
            </button>
          </div>

          {approvalLines.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg text-gray-500">
              결재자를 추가해주세요.
            </div>
          ) : (
            <div className="space-y-2">
              {approvalLines.map((line, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                >
                  <GripVertical size={16} className="text-gray-400 cursor-move" />
                  <span className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-600">
                    {index + 1}
                  </span>
                  <div className="flex-1">
                    <p className="font-medium">{line.name}</p>
                    <p className="text-sm text-gray-500">{line.position}</p>
                  </div>
                  <select
                    value={line.type}
                    onChange={(e) => {
                      const updated = [...approvalLines];
                      updated[index].type = e.target.value;
                      setApprovalLines(updated);
                    }}
                    className="px-2 py-1 text-sm border border-gray-300 rounded"
                  >
                    <option value="approval">결재</option>
                    <option value="agreement">합의</option>
                    <option value="reference">참조</option>
                  </select>
                  <button
                    onClick={() => handleRemoveApprover(index)}
                    className="p-1 hover:bg-red-100 rounded text-red-500"
                  >
                    <X size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 버튼 */}
      <div className="flex gap-3">
        <button
          onClick={() => navigate("/approval")}
          className="px-6 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
        >
          취소
        </button>
        <button
          onClick={() => handleSave(false)}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 font-medium disabled:opacity-50"
        >
          <Save size={18} />
          임시저장
        </button>
        <button
          onClick={() => handleSave(true)}
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
        >
          <Send size={18} />
          {saving ? "처리 중..." : "결재 요청"}
        </button>
      </div>

      {/* 사용자 검색 모달 */}
      <UserSearchModal
        isOpen={userModalOpen}
        onClose={() => setUserModalOpen(false)}
        onSelect={handleAddApprover}
        selectedUsers={approvalLines.map((l) => l.id)}
      />
    </div>
  );
}
