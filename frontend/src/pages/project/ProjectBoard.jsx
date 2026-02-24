// src/pages/project/ProjectBoard.jsx
// 프로젝트 작업보드 (카드형)
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  ChevronDown,
  ChevronRight,
  Star,
  Users,
  ClipboardList,
  Settings,
  Plus,
  RefreshCw,
} from "lucide-react";
import ProjectService from "../../api/project";
import ProjectFormModal from "./ProjectFormModal";

// 진행률 바 컴포넌트
function ProgressBar({ value }) {
  const getColor = () => {
    if (value >= 100) return "bg-green-500";
    if (value >= 70) return "bg-blue-500";
    if (value >= 30) return "bg-yellow-500";
    return "bg-gray-400";
  };

  return (
    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${getColor()}`}
        style={{ width: `${Math.min(value, 100)}%` }}
      />
    </div>
  );
}

// 프로젝트 카드 컴포넌트
function ProjectCard({ project, onEdit, onRefresh }) {
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);

  const getStatusBadge = () => {
    const statusColors = {
      preparing: "bg-gray-100 text-gray-700",
      in_progress: "bg-blue-100 text-blue-700",
      completed: "bg-green-100 text-green-700",
      on_hold: "bg-yellow-100 text-yellow-700",
    };
    return statusColors[project.status] || statusColors.preparing;
  };

  const handleCardClick = () => {
    navigate(`/project/tasks?project_id=${project.id}`);
  };

  const handleToggleImportant = async (e) => {
    e.stopPropagation();
    try {
      await ProjectService.updateProject(project.id, {
        is_important: !project.is_important,
      });
      onRefresh?.();
    } catch (error) {
      console.error("Failed to toggle important", error);
    }
  };

  return (
    <div
      className="bg-white border border-blue-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer relative"
      onClick={handleCardClick}
    >
      {/* 헤더 */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs px-2 py-0.5 rounded ${getStatusBadge()}`}>
              {project.status_display}
            </span>
            {project.is_public && (
              <span className="text-xs px-2 py-0.5 rounded bg-purple-100 text-purple-700">
                공개
              </span>
            )}
          </div>
          <h3 className="font-medium text-sm text-gray-900 truncate">
            {project.name}
          </h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleToggleImportant}
            className={`p-1 rounded hover:bg-gray-100 ${
              project.is_important ? "text-yellow-500" : "text-gray-300"
            }`}
          >
            <Star size={16} fill={project.is_important ? "currentColor" : "none"} />
          </button>
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="p-1 rounded hover:bg-gray-100 text-gray-400"
            >
              <Settings size={16} />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white border rounded shadow-lg z-10 py-1 min-w-[100px]">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(project);
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100"
                >
                  수정
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/project/tasks?project_id=${project.id}`);
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100"
                >
                  업무 보기
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 통계 */}
      <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
        <span className="flex items-center gap-1">
          <Users size={14} />
          {project.member_count || 0}
        </span>
        <span className="flex items-center gap-1">
          <ClipboardList size={14} />
          {project.task_count || 0}
        </span>
      </div>

      {/* 기간 */}
      <div className="text-xs text-gray-500 mb-2">
        {project.start_date || "-"} ~ {project.end_date || "-"}
      </div>

      {/* 진행률 */}
      <div className="flex items-center gap-2">
        <ProgressBar value={project.progress || 0} />
        <span className="text-xs text-gray-600 whitespace-nowrap">
          {project.progress || 0}%
        </span>
      </div>
    </div>
  );
}

// 섹션 컴포넌트
function ProjectSection({ title, icon: Icon, projects, isOpen, onToggle, onEdit, onRefresh }) {
  if (!projects || projects.length === 0) return null;

  return (
    <div className="mb-4">
      <button
        onClick={onToggle}
        className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2 hover:text-gray-900"
      >
        {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        {Icon && <Icon size={16} className="text-yellow-500" />}
        {title}
        <span className="text-gray-400 font-normal">({projects.length})</span>
      </button>
      {isOpen && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onEdit={onEdit}
              onRefresh={onRefresh}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProjectBoard() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 필터 상태
  const [viewMode, setViewMode] = useState("all"); // all, my
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("-updated_at");

  // 섹션 확장 상태
  const [sections, setSections] = useState({
    important: true,
    my: true,
    public: true,
  });

  // 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        ordering: sortBy,
      };
      if (viewMode === "my") {
        params.my_projects = true;
      }
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
  }, [viewMode, statusFilter, searchQuery, sortBy]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // 프로젝트 분류
  const importantProjects = projects.filter((p) => p.is_important);
  const myProjects = projects.filter(
    (p) => !p.is_important && (p.is_public === false || viewMode === "my")
  );
  const publicProjects = projects.filter(
    (p) => !p.is_important && p.is_public && viewMode !== "my"
  );

  const toggleSection = (section) => {
    setSections((prev) => ({ ...prev, [section]: !prev[section] }));
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

  return (
    <div className="p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-gray-900">작업보드</h1>
          <button
            onClick={fetchProjects}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
          >
            <RefreshCw size={18} />
          </button>
        </div>
        <div className="flex items-center gap-2">
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
          <button
            onClick={() => navigate("/project/tasks?project_id=unassigned")}
            className="btn-basic"
          >
            미분류
          </button>
        </div>
      </div>

      {/* 필터 바 */}
      <div className="bg-white border rounded-lg p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          {/* 뷰 모드 토글 */}
          <div className="flex border rounded overflow-hidden">
            <button
              onClick={() => setViewMode("all")}
              className={`px-4 py-2 text-sm ${
                viewMode === "all"
                  ? "bg-blue-500 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-100"
              }`}
            >
              전체보드
            </button>
            <button
              onClick={() => setViewMode("my")}
              className={`px-4 py-2 text-sm ${
                viewMode === "my"
                  ? "bg-blue-500 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-100"
              }`}
            >
              개인보드
            </button>
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

          {/* 정렬 */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="border rounded px-3 py-2 text-sm"
          >
            <option value="-updated_at">최근수정순</option>
            <option value="-created_at">최근생성순</option>
            <option value="name">이름순</option>
            <option value="-progress">진행률높은순</option>
            <option value="end_date">마감임박순</option>
          </select>

          {/* 검색 */}
          <div className="relative flex-1 min-w-[200px]">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="프로젝트 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border rounded pl-9 pr-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      {/* 콘텐츠 */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent" />
        </div>
      ) : error ? (
        <div className="text-center py-20 text-red-500">{error}</div>
      ) : projects.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <p>프로젝트가 없습니다.</p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="mt-4 btn-create"
          >
            첫 프로젝트 만들기
          </button>
        </div>
      ) : (
        <div>
          <ProjectSection
            title="중요 프로젝트"
            icon={Star}
            projects={importantProjects}
            isOpen={sections.important}
            onToggle={() => toggleSection("important")}
            onEdit={handleEdit}
            onRefresh={fetchProjects}
          />
          <ProjectSection
            title="소속 프로젝트"
            projects={myProjects}
            isOpen={sections.my}
            onToggle={() => toggleSection("my")}
            onEdit={handleEdit}
            onRefresh={fetchProjects}
          />
          <ProjectSection
            title="공개 프로젝트"
            projects={publicProjects}
            isOpen={sections.public}
            onToggle={() => toggleSection("public")}
            onEdit={handleEdit}
            onRefresh={fetchProjects}
          />
        </div>
      )}

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
