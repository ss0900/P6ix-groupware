// src/pages/project/TaskForm.jsx
// 업무 등록/수정 폼
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Save,
  List,
  ChevronDown,
  ChevronUp,
  Upload,
  X,
  FileText,
  Bell,
  BellOff,
} from "lucide-react";
import ProjectService from "../../api/project";
import { fetchUsers } from "../../api/users/user";

export default function TaskForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const projectIdFromUrl = searchParams.get("project_id");
  const isEdit = !!id;

  const [formData, setFormData] = useState({
    project: projectIdFromUrl || "",
    title: "",
    content: "",
    manager: "",
    assignee: "",
    status: "waiting",
    priority: "normal",
    start_date: "",
    due_date: "",
    notify_enabled: true,
    watcher_ids: [],
  });

  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [files, setFiles] = useState([]);
  const [existingFiles, setExistingFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      try {
        const [projectsData, usersRes] = await Promise.all([
          ProjectService.getProjects({ ordering: "name" }),
          fetchUsers(),
        ]);
        const usersData = usersRes.data;
        setProjects(Array.isArray(projectsData) ? projectsData : projectsData.results || []);
        setUsers(Array.isArray(usersData) ? usersData : usersData.results || []);
      } catch (err) {
        console.error("Failed to load data", err);
      }
    };
    loadData();
  }, []);

  // 수정 모드 데이터 로드
  useEffect(() => {
    const loadTask = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const task = await ProjectService.getTask(id);
        setFormData({
          project: task.project || "",
          title: task.title || "",
          content: task.content || "",
          manager: task.manager || "",
          assignee: task.assignee || "",
          status: task.status || "waiting",
          priority: task.priority || "normal",
          start_date: task.start_date || "",
          due_date: task.due_date || "",
          notify_enabled: task.notify_enabled ?? true,
          watcher_ids: task.watchers?.map((w) => w.user) || [],
        });
        setExistingFiles(task.attachments || []);
      } catch (err) {
        console.error("Failed to load task", err);
        setError("업무를 불러오는데 실패했습니다.");
      } finally {
        setLoading(false);
      }
    };
    loadTask();
  }, [id]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleWatcherChange = (userId) => {
    setFormData((prev) => ({
      ...prev,
      watcher_ids: prev.watcher_ids.includes(userId)
        ? prev.watcher_ids.filter((id) => id !== userId)
        : [...prev.watcher_ids, userId],
    }));
  };

  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files);
    setFiles((prev) => [...prev, ...newFiles]);
  };

  const handleRemoveFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemoveExistingFile = async (attachmentId) => {
    if (!window.confirm("첨부파일을 삭제하시겠습니까?")) return;
    try {
      await ProjectService.deleteAttachment(attachmentId);
      setExistingFiles((prev) => prev.filter((f) => f.id !== attachmentId));
    } catch (err) {
      console.error("Failed to delete attachment", err);
      alert("파일 삭제에 실패했습니다.");
    }
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles((prev) => [...prev, ...droppedFiles]);
  }, []);

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const payload = new FormData();
      
      // 기본 필드
      if (formData.project && formData.project !== "unassigned") {
        payload.append("project", formData.project);
      }
      payload.append("title", formData.title);
      payload.append("content", formData.content);
      if (formData.manager) payload.append("manager", formData.manager);
      if (formData.assignee) payload.append("assignee", formData.assignee);
      payload.append("status", formData.status);
      payload.append("priority", formData.priority);
      if (formData.start_date) payload.append("start_date", formData.start_date);
      if (formData.due_date) payload.append("due_date", formData.due_date);
      payload.append("notify_enabled", formData.notify_enabled);
      
      // 참조인
      formData.watcher_ids.forEach((id) => {
        payload.append("watcher_ids", id);
      });

      // 파일
      files.forEach((file) => {
        payload.append("files", file);
      });

      if (isEdit) {
        await ProjectService.updateTask(id, payload);
      } else {
        await ProjectService.createTask(payload);
      }

      navigate("/project/tasks");
    } catch (err) {
      console.error("Failed to save task", err);
      setError(
        err.response?.data?.detail ||
          err.response?.data?.title?.[0] ||
          "저장에 실패했습니다."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold text-gray-900">
            {isEdit ? "업무 수정" : "업무 등록"}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/project/tasks")}
            className="btn-basic flex items-center gap-1"
          >
            <List size={16} />
            목록
          </button>
        </div>
      </div>

      {/* 폼 */}
      <form onSubmit={handleSubmit} className="bg-white border rounded-lg p-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm mb-4">
            {error}
          </div>
        )}

        {/* 프로젝트 */}
        <div className="flex items-center gap-4 mb-4 pb-4 border-b">
          <label className="w-24 text-sm font-medium text-gray-700">
            프로젝트
          </label>
          <select
            name="project"
            value={formData.project}
            onChange={handleChange}
            className="flex-1 border rounded px-3 py-2 text-sm"
          >
            <option value="">미분류</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-1 text-sm">
            <button
              type="button"
              onClick={() =>
                setFormData((prev) => ({
                  ...prev,
                  notify_enabled: !prev.notify_enabled,
                }))
              }
              className={`p-2 rounded ${
                formData.notify_enabled
                  ? "text-blue-600 bg-blue-50"
                  : "text-gray-400"
              }`}
            >
              {formData.notify_enabled ? <Bell size={16} /> : <BellOff size={16} />}
            </button>
            알림기
          </label>
        </div>

        {/* 업무명 */}
        <div className="flex items-center gap-4 mb-4">
          <label className="w-24 text-sm font-medium text-gray-700">
            업무명 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            className="flex-1 border rounded px-3 py-2 text-sm"
            placeholder="업무 제목을 입력하세요"
          />
        </div>

        {/* 관리자 */}
        <div className="flex items-center gap-4 mb-4">
          <label className="w-24 text-sm font-medium text-gray-700">
            관리자
          </label>
          <div className="flex items-center gap-2">
            <select
              name="manager"
              value={formData.manager}
              onChange={handleChange}
              className="border rounded px-3 py-2 text-sm min-w-[150px]"
            >
              <option value="">선택</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.last_name}
                  {user.first_name || user.username}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => {
                // 현재 사용자 선택 (실제로는 context에서 가져와야 함)
              }}
              className="text-sm text-blue-600 hover:underline"
            >
              본인 선택
            </button>
          </div>
        </div>

        {/* 담당자 */}
        <div className="flex items-center gap-4 mb-4">
          <label className="w-24 text-sm font-medium text-gray-700">
            담당자
          </label>
          <div className="flex items-center gap-2">
            <select
              name="assignee"
              value={formData.assignee}
              onChange={handleChange}
              className="border rounded px-3 py-2 text-sm min-w-[150px]"
            >
              <option value="">선택</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.last_name}
                  {user.first_name || user.username}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="text-sm text-blue-600 hover:underline"
            >
              선택
            </button>
          </div>
        </div>

        {/* 참조인 */}
        <div className="flex gap-4 mb-4">
          <label className="w-24 text-sm font-medium text-gray-700 pt-2">
            참조인
          </label>
          <div className="flex-1">
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.watcher_ids.map((userId) => {
                const user = users.find((u) => u.id === userId);
                return (
                  <span
                    key={userId}
                    className="inline-flex items-center gap-1 bg-gray-100 px-2 py-1 rounded text-sm"
                  >
                    {user
                      ? `${user.last_name}${user.first_name || user.username}`
                      : userId}
                    <button
                      type="button"
                      onClick={() => handleWatcherChange(userId)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X size={14} />
                    </button>
                  </span>
                );
              })}
            </div>
            <select
              onChange={(e) => {
                if (e.target.value) {
                  handleWatcherChange(parseInt(e.target.value));
                  e.target.value = "";
                }
              }}
              className="border rounded px-3 py-2 text-sm"
              defaultValue=""
            >
              <option value="" disabled>
                참조인 추가
              </option>
              {users
                .filter((u) => !formData.watcher_ids.includes(u.id))
                .map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.last_name}
                    {user.first_name || user.username}
                  </option>
                ))}
            </select>
          </div>
        </div>

        {/* 상세설정 토글 */}
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-1 text-sm text-gray-600 mb-4"
        >
          {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          상세설정
        </button>

        {/* 상세설정 영역 */}
        {showAdvanced && (
          <div className="bg-gray-50 rounded p-4 mb-4 space-y-4">
            <div className="flex items-center gap-4">
              <label className="w-20 text-sm text-gray-600">우선순위</label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className="border rounded px-3 py-2 text-sm"
              >
                <option value="urgent">긴급</option>
                <option value="high">높음</option>
                <option value="normal">보통</option>
                <option value="low">낮음</option>
              </select>
            </div>
            <div className="flex items-center gap-4">
              <label className="w-20 text-sm text-gray-600">상태</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="border rounded px-3 py-2 text-sm"
              >
                <option value="waiting">대기</option>
                <option value="in_progress">진행중</option>
                <option value="completed">완료</option>
                <option value="on_hold">보류</option>
              </select>
            </div>
            <div className="flex items-center gap-4">
              <label className="w-20 text-sm text-gray-600">시작일</label>
              <input
                type="date"
                name="start_date"
                value={formData.start_date}
                onChange={handleChange}
                className="border rounded px-3 py-2 text-sm"
              />
            </div>
            <div className="flex items-center gap-4">
              <label className="w-20 text-sm text-gray-600">마감일</label>
              <input
                type="date"
                name="due_date"
                value={formData.due_date}
                onChange={handleChange}
                className="border rounded px-3 py-2 text-sm"
              />
            </div>
          </div>
        )}

        {/* 첨부파일 */}
        <div className="flex gap-4 mb-4">
          <label className="w-24 text-sm font-medium text-gray-700 pt-2">
            첨부파일
          </label>
          <div className="flex-1">
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="border-2 border-dashed rounded-lg p-4 text-center text-gray-500 hover:border-blue-400 transition cursor-pointer"
              onClick={() => document.getElementById("file-input").click()}
            >
              <Upload size={24} className="mx-auto mb-2 text-gray-400" />
              <p className="text-sm">
                여기로 파일을 드래그하거나 클릭하세요
              </p>
              <input
                id="file-input"
                type="file"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {/* 기존 파일 */}
            {existingFiles.length > 0 && (
              <div className="mt-2 space-y-1">
                {existingFiles.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <FileText size={14} className="text-gray-400" />
                      <span>{file.original_name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveExistingFile(file.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* 새 파일 */}
            {files.length > 0 && (
              <div className="mt-2 space-y-1">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-blue-50 px-3 py-2 rounded text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <FileText size={14} className="text-blue-500" />
                      <span>{file.name}</span>
                      <span className="text-gray-400 text-xs">
                        ({(file.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 내용 */}
        <div className="flex gap-4 mb-6">
          <label className="w-24 text-sm font-medium text-gray-700 pt-2">
            내용
          </label>
          <textarea
            name="content"
            value={formData.content}
            onChange={handleChange}
            rows={10}
            className="flex-1 border rounded px-3 py-2 text-sm"
            placeholder="업무 내용을 입력하세요..."
          />
        </div>

        {/* 버튼 */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn-cancel"
            disabled={saving}
          >
            취소
          </button>
          <button
            type="submit"
            className="btn-create flex items-center gap-1"
            disabled={saving}
          >
            <Save size={16} />
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </form>
    </div>
  );
}
