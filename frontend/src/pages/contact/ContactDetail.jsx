// src/pages/contact/ContactDetail.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Star,
  Paperclip,
  Trash2,
  Edit,
  MessageCircle,
  Send,
  Download,
  User,
  Check,
  Clock,
} from "lucide-react";
import ContactApi from "../../api/ContactApi";

export default function ContactDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  const loadMessage = useCallback(async () => {
    setLoading(true);
    try {
      const data = await ContactApi.getMessage(id);
      setMessage(data);
    } catch (err) {
      console.error("Failed to load message:", err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadMessage();
  }, [loadMessage]);

  // 별표 토글
  const handleToggleStar = async () => {
    try {
      await ContactApi.toggleStar(id);
      loadMessage();
    } catch (err) {
      console.error("Failed to toggle star:", err);
    }
  };

  // 삭제
  const handleDelete = async () => {
    if (!window.confirm("이 메시지를 삭제하시겠습니까?")) return;
    try {
      await ContactApi.moveToTrash(id);
      navigate("/contact");
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  };

  // 댓글 작성
  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    setSubmittingComment(true);
    try {
      await ContactApi.createComment(id, { content: commentText });
      setCommentText("");
      loadMessage();
    } catch (err) {
      console.error("Failed to create comment:", err);
    } finally {
      setSubmittingComment(false);
    }
  };

  // 파일 크기 포맷
  const formatFileSize = (bytes) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  // 날짜 포맷
  const formatDateTime = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-sky-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!message) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">메시지를 찾을 수 없습니다.</p>
        <button
          onClick={() => navigate("/contact")}
          className="mt-4 text-sky-600 hover:underline"
        >
          목록으로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={20} />
          <span>목록으로</span>
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleStar}
            className={`p-2 rounded-lg transition-colors ${
              message.is_starred
                ? "text-yellow-500 bg-yellow-50"
                : "text-gray-400 hover:bg-gray-100"
            }`}
          >
            <Star size={20} className={message.is_starred ? "fill-yellow-400" : ""} />
          </button>
          {message.is_draft && (
            <button
              onClick={() => navigate(`/contact/${id}/edit`)}
              className="flex items-center gap-1 px-3 py-2 text-sm text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
            >
              <Edit size={16} />
              편집
            </button>
          )}
          <button
            onClick={handleDelete}
            className="flex items-center gap-1 px-3 py-2 text-sm text-red-600 bg-red-50 rounded-lg hover:bg-red-100"
          >
            <Trash2 size={16} />
            삭제
          </button>
        </div>
      </div>

      {/* 메시지 내용 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* 제목 */}
        <div className="p-6 border-b border-gray-100">
          <h1 className="text-xl font-bold text-gray-900 mb-4">{message.title}</h1>
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <User size={14} />
                {message.sender?.full_name || message.sender?.username}
              </span>
              <span>{formatDateTime(message.created_at)}</span>
            </div>
            {message.total_recipients > 0 && (
              <span
                className={`${
                  message.read_count === message.total_recipients
                    ? "text-green-600"
                    : "text-orange-500"
                }`}
              >
                읽음 {message.read_count}/{message.total_recipients}
              </span>
            )}
          </div>
        </div>

        {/* 수신자 목록 */}
        {message.recipients && message.recipients.length > 0 && (
          <div className="p-4 bg-gray-50 border-b border-gray-100">
            <div className="text-sm text-gray-600 mb-2">수신자</div>
            <div className="flex flex-wrap gap-2">
              {message.recipients.map((r) => (
                <span
                  key={r.id}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded text-sm ${
                    r.is_read
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {r.is_read ? <Check size={12} /> : <Clock size={12} />}
                  {r.recipient?.full_name || r.recipient?.username}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 본문 */}
        <div className="p-6">
          <div
            className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: message.content.replace(/\n/g, "<br/>") }}
          />
        </div>

        {/* 첨부파일 */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="p-4 bg-gray-50 border-t border-gray-100">
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
              <Paperclip size={16} />
              첨부파일 ({message.attachments.length})
            </div>
            <div className="space-y-2">
              {message.attachments.map((att) => (
                <a
                  key={att.id}
                  href={att.file}
                  download={att.original_name}
                  className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <Download size={18} className="text-gray-400" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {att.original_name}
                    </div>
                    <div className="text-xs text-gray-500">{formatFileSize(att.file_size)}</div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 댓글 섹션 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <MessageCircle size={18} />
            댓글 ({message.comments?.length || 0})
          </h2>
        </div>

        {/* 댓글 목록 */}
        <div className="divide-y divide-gray-100">
          {message.comments && message.comments.length > 0 ? (
            message.comments.map((comment) => (
              <div key={comment.id} className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-medium text-gray-900">
                    {comment.author?.full_name || comment.author?.username}
                  </span>
                  <span className="text-sm text-gray-500">
                    {formatDateTime(comment.created_at)}
                  </span>
                </div>
                <p className="text-gray-700 whitespace-pre-wrap">{comment.content}</p>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-gray-500">댓글이 없습니다.</div>
          )}
        </div>

        {/* 댓글 입력 */}
        <form onSubmit={handleSubmitComment} className="p-4 bg-gray-50 border-t border-gray-100">
          <div className="flex gap-2">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="댓글을 입력하세요..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
            />
            <button
              type="submit"
              disabled={submittingComment || !commentText.trim()}
              className="px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={18} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
