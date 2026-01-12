// src/pages/board/PostDetail.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Eye, 
  Calendar,
  User,
  MessageCircle,
  Send
} from "lucide-react";

// 댓글 아이템
const CommentItem = ({ comment, onDelete, currentUserId }) => {
  return (
    <div className="py-4 border-b border-gray-100 last:border-0">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center shrink-0">
          <User size={16} className="text-gray-500" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-gray-900">{comment.author_name}</span>
            <span className="text-xs text-gray-400">
              {new Date(comment.created_at).toLocaleString('ko-KR')}
            </span>
          </div>
          <p className="text-gray-700 whitespace-pre-wrap">{comment.content}</p>
        </div>
        {comment.author === currentUserId && (
          <button
            onClick={() => onDelete(comment.id)}
            className="p-1 hover:bg-red-100 rounded text-red-500"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
      
      {/* 대댓글 */}
      {comment.replies?.length > 0 && (
        <div className="ml-11 mt-3 space-y-3">
          {comment.replies.map((reply) => (
            <CommentItem 
              key={reply.id} 
              comment={reply} 
              onDelete={onDelete}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default function PostDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // 게시글 로드
  const loadPost = async () => {
    setLoading(true);
    try {
      const res = await api.get(`board/posts/${id}/`);
      setPost(res.data);
    } catch (err) {
      console.error(err);
      alert("게시글을 불러올 수 없습니다.");
      navigate("/board");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPost();
  }, [id]);

  // 게시글 삭제
  const handleDelete = async () => {
    if (!window.confirm("게시글을 삭제하시겠습니까?")) return;

    try {
      await api.delete(`board/posts/${id}/`);
      navigate("/board");
    } catch (err) {
      console.error(err);
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  // 댓글 작성
  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      await api.post(`board/posts/${id}/add_comment/`, {
        content: newComment,
      });
      setNewComment("");
      loadPost();
    } catch (err) {
      console.error(err);
      alert("댓글 작성 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  // 댓글 삭제
  const handleDeleteComment = async (commentId) => {
    if (!window.confirm("댓글을 삭제하시겠습니까?")) return;

    try {
      await api.delete(`board/comments/${commentId}/`);
      loadPost();
    } catch (err) {
      console.error(err);
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!post) return null;

  const isAuthor = post.author === user?.id;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/board")}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft size={20} />
        </button>
        <span className="text-sm px-2 py-1 bg-blue-100 text-blue-700 rounded">
          {post.board_name}
        </span>
      </div>

      {/* 게시글 */}
      <div className="bg-white rounded-xl border border-gray-200">
        {/* 제목 */}
        <div className="p-6 border-b border-gray-100">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{post.title}</h1>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <User size={14} />
                {post.author_name}
              </span>
              <span className="flex items-center gap-1">
                <Calendar size={14} />
                {new Date(post.created_at).toLocaleString('ko-KR')}
              </span>
              <span className="flex items-center gap-1">
                <Eye size={14} />
                {post.view_count}
              </span>
            </div>
            {isAuthor && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate(`/board/${id}/edit`)}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  <Edit size={14} />
                  수정
                </button>
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 size={14} />
                  삭제
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 내용 */}
        <div className="p-6">
          <div className="prose max-w-none whitespace-pre-wrap">
            {post.content}
          </div>
        </div>
      </div>

      {/* 댓글 */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <MessageCircle size={18} />
            댓글 {post.comments?.length || 0}
          </h2>
        </div>

        {/* 댓글 목록 */}
        <div className="px-4">
          {post.comments?.length > 0 ? (
            post.comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                onDelete={handleDeleteComment}
                currentUserId={user?.id}
              />
            ))
          ) : (
            <div className="py-8 text-center text-gray-400">
              첫 번째 댓글을 작성해보세요!
            </div>
          )}
        </div>

        {/* 댓글 입력 */}
        <div className="p-4 border-t border-gray-100">
          <div className="flex gap-3">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="댓글을 입력하세요..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              onKeyPress={(e) => e.key === "Enter" && handleAddComment()}
            />
            <button
              onClick={handleAddComment}
              disabled={submitting || !newComment.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
            >
              <Send size={16} />
              등록
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
