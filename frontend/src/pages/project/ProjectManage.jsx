// src/pages/project/ProjectManage.jsx
// 프로젝트 구성 (테이블형)
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Plus, Edit, Trash2, RefreshCw } from "lucide-react";
import ProjectService from "../../api/project";
import ProjectFormModal from "./ProjectFormModal";

export default function ProjectManage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 필터 상태
  const [searchField, setSearchField] = useState("name");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        ordering: "-updated_at",
      };
      if (statusFilter) {
        params.status = statusFilter;
      }
      if (searchQuery) {
        params.search = searchQuery;
      }
      const data = await ProjectService.getProjects(params);
      setProjects(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      console.error("Failed to fetch projects", err);
      setError("프로젝트를 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleDelete = async (project) => {
    if (!window.confirm(`"${project.name}" 프로젝트를 삭제하시겠습니까?`)) {
      return;
    }
    try {
      await ProjectService.deleteProject(project.id);
      fetchProjects();
    } catch (err) {
      console.error("Failed to delete project", err);
      alert("삭제에 실패했습니다.");
    }
  };

  const handleEdit = (project) => {
    setEditingProject(project);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingProject(null);
  };

  const handleModalSuccess = () => {
    handleModalClose();
    fetchProjects();
  };

  const getStatusBadge = (status, statusDisplay) => {
    const colors = {
      preparing: "bg-gray-100 text-gray-700",
      in_progress: "bg-blue-100 text-blue-700",
      completed: "bg-green-100 text-green-700",
      on_hold: "bg-yellow-100 text-yellow-700",
    };
    return (
      <span className={`px-2 py-0.5 rounded text-xs ${colors[status] || colors.preparing}`}>
        {statusDisplay}
      </span>
    );
  };

  return (
    <div className="p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-gray-900">프로젝트 구성</h1>
          <button
            onClick={fetchProjects}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
          >
            <RefreshCw size={18} />
          </button>
        </div>
        <button
          onClick={() => {
            setEditingProject(null);
            setIsModalOpen(true);
          }}
          className="btn-create flex items-center gap-1"
        >
          <Plus size={16} />
          프로젝트 등록
        </button>
      </div>

      {/* 필터 바 */}
      <div className="bg-white border rounded-lg p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          {/* 검색 필드 선택 */}
          <select
            value={searchField}
            onChange={(e) => setSearchField(e.target.value)}
            className="border rounded px-3 py-2 text-sm"
          >
            <option value="name">명칭</option>
            <option value="code">코드</option>
          </select>

          {/* 검색 */}
          <div className="relative flex-1 min-w-[200px]">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border rounded pl-9 pr-3 py-2 text-sm"
            />
          </div>

          {/* 상태 필터 */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border rounded px-3 py-2 text-sm"
          >
            <option value="">상태:전체</option>
            <option value="preparing">준비중</option>
            <option value="in_progress">진행중</option>
            <option value="completed">완료</option>
            <option value="on_hold">보류</option>
          </select>

          <span className="text-sm text-gray-500">
            총 {projects.length}건
          </span>
        </div>
      </div>

      {/* 테이블 */}
      <div className="bg-white border rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent" />
          </div>
        ) : error ? (
          <div className="text-center py-20 text-red-500">{error}</div>
        ) : projects.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            프로젝트가 없습니다.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-700">
                  번호
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">
                  코드
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">
                  명칭
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">
                  관리자
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
                <th className="px-4 py-3 text-center font-medium text-gray-700">
                  액션
                </th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project, index) => (
                <tr
                  key={project.id}
                  className="border-b hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/project/tasks?project_id=${project.id}`)}
                >
                  <td className="px-4 py-3 text-gray-600">{index + 1}</td>
                  <td className="px-4 py-3 text-blue-600 font-medium">
                    {project.code}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="truncate max-w-[200px]">
                        {project.name}
                      </span>
                      {project.is_public && (
                        <span className="text-xs px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded">
                          공개
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {project.manager_name || "-"}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {project.updated_at
                      ? new Date(project.updated_at).toLocaleString("ko-KR", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "-"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {project.start_date || "-"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {project.end_date || "-"}
                  </td>
                  <td className="px-4 py-3">
                    {getStatusBadge(project.status, project.status_display)}
                    <span className="ml-2 text-xs text-gray-500">
                      진행({project.progress || 0}%)
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(project);
                        }}
                        className="p-1.5 hover:bg-gray-100 rounded text-gray-500"
                        title="수정"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(project);
                        }}
                        className="p-1.5 hover:bg-red-50 rounded text-red-500"
                        title="삭제"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 모달 */}
      <ProjectFormModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        project={editingProject}
      />
    </div>
  );
}
