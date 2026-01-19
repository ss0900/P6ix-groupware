// src/pages/project/ProjectFormModal.jsx
// 프로젝트 등록/수정 모달
import React, { useState, useEffect } from "react";
import { X, Calendar, Users, Plus, Trash2 } from "lucide-react";
import ProjectService from "../../api/project";
import { fetchUsers } from "../../api/users/user";

export default function ProjectFormModal({
  isOpen,
  onClose,
  onSuccess,
  project = null,
}) {
  const isEdit = !!project;

  const [formData, setFormData] = useState({
    code: "",
    name: "",
    description: "",
    start_date: "",
    end_date: "",
    status: "preparing",
    progress: 0,
    is_public: false,
    manager: null,
    use_manager: false,
  });

  const [members, setMembers] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 사용자 목록 로드
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const res = await fetchUsers();
        const data = res.data;
        setUsers(Array.isArray(data) ? data : data.results || []);
      } catch (err) {
        console.error("Failed to load users", err);
      }
    };
    if (isOpen) {
      loadUsers();
    }
  }, [isOpen]);

  // 수정 모드일 때 기존 데이터 로드
  useEffect(() => {
    if (isOpen && project) {
      setFormData({
        code: project.code || "",
        name: project.name || "",
        description: project.description || "",
        start_date: project.start_date || "",
        end_date: project.end_date || "",
        status: project.status || "preparing",
        progress: project.progress || 0,
        is_public: project.is_public || false,
        manager: project.manager || null,
        use_manager: !!project.manager,
      });
      setMembers(project.members || []);
    } else if (isOpen) {
      // 새로 만들기 - 폼 초기화
      setFormData({
        code: "",
        name: "",
        description: "",
        start_date: "",
        end_date: "",
        status: "preparing",
        progress: 0,
        is_public: false,
        manager: null,
        use_manager: false,
      });
      setMembers([]);
    }
  }, [isOpen, project]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleAddMember = (userId) => {
    if (!userId || members.some((m) => m.user === parseInt(userId))) return;
    const user = users.find((u) => u.id === parseInt(userId));
    if (user) {
      setMembers((prev) => [
        ...prev,
        {
          user: user.id,
          user_name: `${user.last_name}${user.first_name}` || user.username,
          role: "member",
        },
      ]);
    }
  };

  const handleRemoveMember = (userId) => {
    setMembers((prev) => prev.filter((m) => m.user !== userId));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = {
        code: formData.code,
        name: formData.name,
        description: formData.description,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        status: formData.status,
        progress: parseInt(formData.progress) || 0,
        is_public: formData.is_public,
        manager: formData.use_manager ? formData.manager : null,
      };

      let savedProject;
      if (isEdit) {
        savedProject = await ProjectService.updateProject(project.id, payload);
      } else {
        savedProject = await ProjectService.createProject(payload);
      }

      // 멤버 업데이트 (새 프로젝트이거나 멤버가 변경된 경우)
      if (savedProject && members.length > 0) {
        for (const member of members) {
          try {
            await ProjectService.addProjectMember(
              savedProject.id,
              member.user,
              member.role
            );
          } catch (err) {
            console.error("Failed to add member", err);
          }
        }
      }

      onSuccess?.();
    } catch (err) {
      console.error("Failed to save project", err);
      setError(
        err.response?.data?.detail ||
          err.response?.data?.code?.[0] ||
          "저장에 실패했습니다."
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">
            {isEdit ? "프로젝트 수정" : "프로젝트 등록"}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded text-gray-500"
          >
            <X size={20} />
          </button>
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm">
              {error}
            </div>
          )}

          {/* 코드 */}
          <div className="flex items-center gap-4">
            <label className="w-24 text-sm font-medium text-gray-700">
              코드
            </label>
            <div className="flex-1 flex items-center gap-2">
              <input
                type="text"
                name="code"
                value={formData.code}
                onChange={handleChange}
                required
                className="flex-1 border rounded px-3 py-2 text-sm"
                placeholder="프로젝트 코드"
              />
              <label className="flex items-center gap-1 text-sm">
                <input
                  type="checkbox"
                  name="use_manager"
                  checked={formData.use_manager}
                  onChange={handleChange}
                />
                담당자 지정
              </label>
            </div>
          </div>

          {/* 명칭 */}
          <div className="flex items-center gap-4">
            <label className="w-24 text-sm font-medium text-gray-700">
              명칭
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="flex-1 border rounded px-3 py-2 text-sm"
              placeholder="프로젝트 명칭"
            />
          </div>

          {/* 관리자 */}
          {formData.use_manager && (
            <div className="flex items-center gap-4">
              <label className="w-24 text-sm font-medium text-gray-700">
                관리자
              </label>
              <div className="flex-1 flex items-center gap-2">
                <Users size={16} className="text-gray-400" />
                <select
                  name="manager"
                  value={formData.manager || ""}
                  onChange={handleChange}
                  className="flex-1 border rounded px-3 py-2 text-sm"
                >
                  <option value="">선택</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.last_name}
                      {user.first_name || user.username}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* 시작일 */}
          <div className="flex items-center gap-4">
            <label className="w-24 text-sm font-medium text-gray-700">
              시작일
            </label>
            <div className="flex-1 flex items-center gap-2">
              <Calendar size={16} className="text-gray-400" />
              <input
                type="date"
                name="start_date"
                value={formData.start_date}
                onChange={handleChange}
                className="flex-1 border rounded px-3 py-2 text-sm"
              />
            </div>
          </div>

          {/* 종료일 */}
          <div className="flex items-center gap-4">
            <label className="w-24 text-sm font-medium text-gray-700">
              종료일
            </label>
            <div className="flex-1 flex items-center gap-2">
              <Calendar size={16} className="text-gray-400" />
              <input
                type="date"
                name="end_date"
                value={formData.end_date}
                onChange={handleChange}
                className="flex-1 border rounded px-3 py-2 text-sm"
              />
            </div>
          </div>

          {/* 공개 여부 */}
          <div className="flex items-center gap-4">
            <label className="w-24 text-sm font-medium text-gray-700" />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="is_public"
                checked={formData.is_public}
                onChange={handleChange}
              />
              프로젝트 공개
            </label>
          </div>

          {/* 상태 및 진행률 */}
          <div className="flex items-center gap-4">
            <label className="w-24 text-sm font-medium text-gray-700">
              상태
            </label>
            <div className="flex-1 flex items-center gap-4">
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="border rounded px-3 py-2 text-sm"
              >
                <option value="preparing">준비중</option>
                <option value="in_progress">진행중</option>
                <option value="completed">완료</option>
                <option value="on_hold">보류</option>
              </select>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  name="progress"
                  value={formData.progress}
                  onChange={handleChange}
                  min="0"
                  max="100"
                  className="w-20 border rounded px-3 py-2 text-sm"
                />
                <span className="text-sm text-gray-500">%</span>
              </div>
            </div>
          </div>

          {/* 팀원 */}
          <div className="flex gap-4">
            <label className="w-24 text-sm font-medium text-gray-700 pt-2">
              팀원
            </label>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <select
                  onChange={(e) => {
                    handleAddMember(e.target.value);
                    e.target.value = "";
                  }}
                  className="flex-1 border rounded px-3 py-2 text-sm"
                  defaultValue=""
                >
                  <option value="" disabled>
                    팀원 선택
                  </option>
                  {users
                    .filter((u) => !members.some((m) => m.user === u.id))
                    .map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.last_name}
                        {user.first_name || user.username}
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  onClick={() => {}}
                  className="p-2 border rounded hover:bg-gray-100"
                >
                  <Plus size={16} />
                </button>
              </div>
              <div className="space-y-1">
                {members.map((member) => (
                  <div
                    key={member.user}
                    className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded text-sm"
                  >
                    <span>{member.user_name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(member.user)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 메모 */}
          <div className="flex gap-4">
            <label className="w-24 text-sm font-medium text-gray-700 pt-2">
              메모
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="flex-1 border rounded px-3 py-2 text-sm"
              placeholder="프로젝트 설명..."
            />
          </div>

          {/* 버튼 */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="btn-cancel"
              disabled={loading}
            >
              닫기
            </button>
            <button type="submit" className="btn-create" disabled={loading}>
              {loading ? "저장 중..." : "등록"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
