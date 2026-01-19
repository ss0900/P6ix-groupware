// src/pages/project/TaskDetail.jsx
// 업무 상세 페이지
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Edit,
  Trash2,
  FileText,
  Download,
  Send,
  User,
  Calendar,
  Clock,
  Star,
  MessageSquare,
} from "lucide-react";
import ProjectService from "../../api/project";

export default function TaskDetail() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 댓글 상태
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    const loadTask = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await ProjectService.getTask(id);
        setTask(data);
        
        // 읽음 처리
        if (!data.is_read) {
          await ProjectService.updateTask(id, { is_read: true });
        }
      } catch (err) {
        console.error("Failed to load task", err);
        setError("업무를 불러오는데 실패했습니다.");
      } finally {
        setLoading(false);
      }
    };
    loadTask();
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm("이 업무를 삭제하시겠습니까?")) return;
    try {
      await ProjectService.deleteTask(id);
      navigate("/project/tasks");
    } catch (err) {
      console.error("Failed to delete task", err);
      alert("삭제에 실패했습니다.");
    }
  };

  const handleToggleImportant = async () => {
    try {
      await ProjectService.updateTask(id, { is_important: !task.is_important });
      setTask((prev) => ({ ...prev, is_important: !prev.is_important }));
    } catch (err) {
      console.error("Failed to toggle important", err);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmittingComment(true);
    try {
      const comment = await ProjectService.createComment(id, newComment);
      setTask((prev) => ({
        ...prev,
        comments: [...(prev.comments || []), comment],
      }));
      setNewComment("");
    } catch (err) {
      console.error("Failed to add comment", err);
      alert("댓글 작성에 실패했습니다.");
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm("댓글을 삭제하시겠습니까?")) return;
    try {
      await ProjectService.deleteComment(commentId);
      setTask((prev) => ({
        ...prev,
        comments: prev.comments.filter((c) => c.id !== commentId),
      }));
    } catch (err) {
      console.error("Failed to delete comment", err);
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
      <span className={`px-2 py-0.5 rounded text-xs ${colors[priority] || colors.normal}`}>
        {priorityDisplay}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="p-6">
        <div className="text-center py-20 text-red-500">
          {error || "업무를 찾을 수 없습니다."}
        </div>
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
          <h1 className="text-xl font-bold text-gray-900">업무 상세</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleImportant}
            className={`p-2 rounded ${
              task.is_important
                ? "text-yellow-500 bg-yellow-50"
                : "text-gray-400 hover:bg-gray-100"
            }`}
          >
            <Star size={18} fill={task.is_important ? "currentColor" : "none"} />
          </button>
          <button
            onClick={() => navigate(`/project/tasks/${id}/edit`)}
            className="btn-edit flex items-center gap-1"
          >
            <Edit size={16} />
            수정
          </button>
          <button onClick={handleDelete} className="btn-delete flex items-center gap-1">
            <Trash2 size={16} />
            삭제
          </button>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="bg-white border rounded-lg">
        {/* 제목 영역 */}
        <div className="p-6 border-b">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm text-blue-600">
              [{task.project_name || "미분류"}]
            </span>
            {getStatusBadge(task.status, task.status_display)}
            {getPriorityBadge(task.priority, task.priority_display)}
            {task.is_disabled && (
              <span className="px-2 py-0.5 rounded text-xs bg-red-100 text-red-700">
                사용중지
              </span>
            )}
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {task.title}
          </h2>

          {/* 메타 정보 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <User size={14} />
              <span>관리자: {task.manager_name || "-"}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <User size={14} />
              <span>담당자: {task.assignee_name || "-"}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar size={14} />
              <span>시작일: {task.start_date || "-"}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar size={14} />
              <span>마감일: {task.due_date || "-"}</span>
            </div>
          </div>

          {/* 참조인 */}
          {task.watchers && task.watchers.length > 0 && (
            <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
              <span>참조인:</span>
              {task.watchers.map((w) => (
                <span
                  key={w.id}
                  className="px-2 py-0.5 bg-gray-100 rounded text-xs"
                >
                  {w.user_name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 내용 */}
        <div className="p-6 border-b">
          <h3 className="text-sm font-medium text-gray-700 mb-2">내용</h3>
          <div className="prose prose-sm max-w-none">
            {task.content ? (
              <div
                className="text-gray-700 whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ __html: task.content }}
              />
            ) : (
              <p className="text-gray-400">내용이 없습니다.</p>
            )}
          </div>
        </div>

        {/* 첨부파일 */}
        {task.attachments && task.attachments.length > 0 && (
          <div className="p-6 border-b">
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              첨부파일 ({task.attachments.length})
            </h3>
            <div className="space-y-2">
              {task.attachments.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded"
                >
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-gray-400" />
                    <span className="text-sm">{file.original_name}</span>
                    <span className="text-xs text-gray-400">
                      ({(file.file_size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <a
                    href={file.file_url || file.file}
                    download
                    className="p-1 hover:bg-gray-200 rounded text-gray-600"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Download size={16} />
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 댓글 */}
        <div className="p-6">
          <h3 className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
            <MessageSquare size={16} />
            댓글 ({task.comments?.length || 0})
          </h3>

          {/* 댓글 목록 */}
          <div className="space-y-4 mb-4">
            {task.comments && task.comments.length > 0 ? (
              task.comments.map((comment) => (
                <div key={comment.id} className="bg-gray-50 rounded p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                        <User size={14} className="text-gray-600" />
                      </div>
                      <span className="text-sm font-medium">
                        {comment.author_name}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(comment.created_at).toLocaleString("ko-KR")}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteComment(comment.id)}
                      className="text-xs text-red-500 hover:underline"
                    >
                      삭제
                    </button>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {comment.content}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">
                댓글이 없습니다.
              </p>
            )}
          </div>

          {/* 댓글 입력 */}
          <form onSubmit={handleAddComment} className="flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="댓글을 입력하세요..."
              className="flex-1 border rounded px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={submittingComment || !newComment.trim()}
              className="btn-create flex items-center gap-1"
            >
              <Send size={14} />
              작성
            </button>
          </form>
        </div>

        {/* 푸터 정보 */}
        <div className="px-6 py-3 bg-gray-50 text-xs text-gray-500 flex items-center gap-4 border-t">
          <span className="flex items-center gap-1">
            <User size={12} />
            작성자: {task.created_by_name || "-"}
          </span>
          <span className="flex items-center gap-1">
            <Clock size={12} />
            생성: {task.created_at ? new Date(task.created_at).toLocaleString("ko-KR") : "-"}
          </span>
          <span className="flex items-center gap-1">
            <Clock size={12} />
            수정: {task.updated_at ? new Date(task.updated_at).toLocaleString("ko-KR") : "-"}
          </span>
        </div>
      </div>
    </div>
  );
}
