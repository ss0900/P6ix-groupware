// src/pages/project/TaskList.jsx
// 업무 관리 (테이블형)
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Search,
  Plus,
  Star,
  Check,
  Eye,
  EyeOff,
  Pause,
  Play,
  Trash2,
  RefreshCw,
  List,
  Grid,
  LayoutGrid,
} from "lucide-react";
import ProjectService from "../../api/project";

export default function TaskList() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const projectIdFromUrl = searchParams.get("project_id");

  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 선택 상태
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

  // 필터 상태
  const [projectFilter, setProjectFilter] = useState(projectIdFromUrl || "");
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [includeDisabled, setIncludeDisabled] = useState(false);
  const [viewMode, setViewMode] = useState("table"); // table, list, card

  const fetchProjects = useCallback(async () => {
    try {
      const data = await ProjectService.getProjects({ ordering: "name" });
      setProjects(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      console.error("Failed to fetch projects", err);
    }
  }, []);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        ordering: "-updated_at",
        include_disabled: includeDisabled ? "true" : "false",
      };
      if (projectFilter) {
        params.project_id = projectFilter;
      }
      if (statusFilter) {
        params.status = statusFilter;
      }
      if (searchQuery) {
        params.search = searchQuery;
      }
      const data = await ProjectService.getTasks(params);
      setTasks(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      console.error("Failed to fetch tasks", err);
      setError("업무를 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }, [projectFilter, statusFilter, searchQuery, includeDisabled]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    if (projectIdFromUrl) {
      setProjectFilter(projectIdFromUrl);
    }
  }, [projectIdFromUrl]);

  // 선택 핸들러
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedIds([]);
    } else {
      setSelectedIds(tasks.map((t) => t.id));
    }
    setSelectAll(!selectAll);
  };

  const handleSelectOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // 일괄 처리 핸들러
  const handleBulkAction = async (action) => {
    if (selectedIds.length === 0) {
      alert("선택된 업무가 없습니다.");
      return;
    }
    
    const actionLabels = {
      read: "읽음 처리",
      unread: "안읽음 처리",
      disable: "사용중지",
      enable: "중지해제",
      delete: "삭제",
    };
    
    if (action === "delete") {
      if (!window.confirm(`선택한 ${selectedIds.length}개의 업무를 삭제하시겠습니까?`)) {
        return;
      }
    }

    try {
      await ProjectService.bulkUpdateTasks(selectedIds, action);
      setSelectedIds([]);
      setSelectAll(false);
      fetchTasks();
    } catch (err) {
      console.error("Bulk action failed", err);
      alert(`${actionLabels[action]}에 실패했습니다.`);
    }
  };

  const getStatusBadge = (status, statusDisplay) => {
    const colors = {
      waiting: "bg-gray-100 text-gray-700",
      in_progress: "bg-blue-100 text-blue-700",
      completed: "bg-green-100 text-green-700",
      on_hold: "bg-yellow-100 text-yellow-700",
    };
    return (
      <span className={`px-2 py-0.5 rounded text-xs ${colors[status] || colors.waiting}`}>
        {statusDisplay}
      </span>
    );
  };

  const getPriorityBadge = (priority, priorityDisplay) => {
    const colors = {
      urgent: "bg-red-100 text-red-700",
      high: "bg-orange-100 text-orange-700",
      normal: "bg-gray-100 text-gray-600",
      low: "bg-gray-50 text-gray-500",
    };
    return (
      <span className={`px-1.5 py-0.5 rounded text-xs ${colors[priority] || colors.normal}`}>
        {priorityDisplay}
      </span>
    );
  };

  return (
    <div className="p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-gray-900">업무 관리</h1>
          <button
            onClick={fetchTasks}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
          >
            <RefreshCw size={18} />
          </button>
        </div>
        <button
          onClick={() => navigate("/project/tasks/new")}
          className="btn-create flex items-center gap-1"
        >
          <Plus size={16} />
          업무 등록
        </button>
      </div>

      {/* 필터 바 */}
      <div className="bg-white border rounded-lg p-4 mb-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* 프로젝트 필터 */}
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="border rounded px-3 py-2 text-sm"
          >
            <option value="">프로젝트:전체</option>
            <option value="unassigned">미분류</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {/* 상태 필터 */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border rounded px-3 py-2 text-sm"
          >
            <option value="">상태:전체</option>
            <option value="waiting">대기</option>
            <option value="in_progress">진행중</option>
            <option value="completed">완료</option>
            <option value="on_hold">보류</option>
          </select>

          {/* 검색 */}
          <div className="relative flex-1 min-w-[200px]">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="업무 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border rounded pl-9 pr-3 py-2 text-sm"
            />
          </div>

          {/* 사용중지 포함 */}
          <label className="flex items-center gap-1 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={includeDisabled}
              onChange={(e) => setIncludeDisabled(e.target.checked)}
            />
            사용중지 표시
          </label>

          {/* 뷰 모드 */}
          <div className="flex border rounded overflow-hidden">
            <button
              onClick={() => setViewMode("table")}
              className={`p-2 ${viewMode === "table" ? "bg-blue-100 text-blue-700" : "bg-white text-gray-600"}`}
            >
              <List size={16} />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 ${viewMode === "grid" ? "bg-blue-100 text-blue-700" : "bg-white text-gray-600"}`}
            >
              <Grid size={16} />
            </button>
            <button
              onClick={() => setViewMode("card")}
              className={`p-2 ${viewMode === "card" ? "bg-blue-100 text-blue-700" : "bg-white text-gray-600"}`}
            >
              <LayoutGrid size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* 일괄 액션 바 */}
      <div className="bg-white border rounded-lg p-3 mb-4 flex items-center gap-2">
        <span className="text-sm text-gray-600">
          선택: {selectedIds.length}건
        </span>
        <div className="border-l h-5 mx-2" />
        <button
          onClick={() => handleBulkAction("read")}
          className="btn-basic-sm flex items-center gap-1"
        >
          <Eye size={14} />
          읽음
        </button>
        <button
          onClick={() => handleBulkAction("unread")}
          className="btn-basic-sm flex items-center gap-1"
        >
          <EyeOff size={14} />
          안읽음
        </button>
        <button
          onClick={() => handleBulkAction("disable")}
          className="btn-basic-sm flex items-center gap-1"
        >
          <Pause size={14} />
          사용중지
        </button>
        <button
          onClick={() => handleBulkAction("enable")}
          className="btn-basic-sm flex items-center gap-1"
        >
          <Play size={14} />
          중지해제
        </button>
        <button
          onClick={() => handleBulkAction("delete")}
          className="btn-delete-sm flex items-center gap-1"
        >
          <Trash2 size={14} />
          삭제
        </button>
      </div>

      {/* 테이블 */}
      <div className="bg-white border rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent" />
          </div>
        ) : error ? (
          <div className="text-center py-20 text-red-500">{error}</div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            업무가 없습니다.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-center w-10">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={handleSelectAll}
                  />
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-700 w-12">
                  번호
                </th>
                <th className="px-4 py-3 text-center font-medium text-gray-700 w-10">
                  <Star size={14} className="inline" />
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">
                  업무명
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">
                  담당자
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">
                  최근변경
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">
                  시작일
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">
                  종료일
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">
                  상태
                </th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task, index) => (
                <tr
                  key={task.id}
                  className={`border-b hover:bg-gray-50 cursor-pointer ${
                    task.is_disabled ? "opacity-50" : ""
                  } ${!task.is_read ? "bg-blue-50" : ""}`}
                  onClick={() => navigate(`/project/tasks/${task.id}`)}
                >
                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(task.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleSelectOne(task.id);
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                  <td className="px-4 py-3 text-gray-600">{index + 1}</td>
                  <td className="px-4 py-3 text-center">
                    <Star
                      size={14}
                      className={
                        task.is_important
                          ? "text-yellow-500 fill-yellow-500"
                          : "text-gray-300"
                      }
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">
                        [{task.project_name}]
                      </span>
                      <span className={`truncate max-w-[250px] ${!task.is_read ? "font-medium" : ""}`}>
                        {task.title}
                      </span>
                      {task.is_disabled && (
                        <span className="text-xs px-1 py-0.5 bg-red-100 text-red-600 rounded">
                          중지
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {task.assignee_name || "-"}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {task.updated_at
                      ? new Date(task.updated_at).toLocaleString("ko-KR", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "-"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {task.start_date || "-"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {task.due_date || "-"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {getStatusBadge(task.status, task.status_display)}
                      {getPriorityBadge(task.priority, task.priority_display)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
