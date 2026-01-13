// src/pages/board/BoardView.jsx
import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import BoardService from "../../api/board";
import { ArrowLeft, Edit, Trash2, Paperclip } from "lucide-react";

export default function BoardView() {
  const { postId } = useParams();
  const navigate = useNavigate();

  const [item, setItem] = useState(null);
  const [isEdit, setIsEdit] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await BoardService.getPost(postId);
      setItem(res);
      setTitle(res.title);
      setContent(res.content);
    } catch (err) {
      console.error(err);
      alert("게시글을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (postId) fetchData();
  }, [postId]);

  const handleSave = async () => {
    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("content", content);

      await BoardService.updatePost(postId, formData);
      alert("수정되었습니다.");
      setIsEdit(false);
      fetchData();
    } catch (e) {
      console.error(e);
      alert("수정 실패");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("삭제하시겠습니까?")) return;

    try {
      await BoardService.deletePost(postId);
      alert("삭제되었습니다.");
      navigate(-1);
    } catch (e) {
      console.error(e);
      alert("삭제 실패");
    }
  };

  const formatKoreanDate = (datetime) => {
    if (!datetime) return "";
    const d = new Date(datetime);
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  if (loading) return <p className="p-6">불러오는 중...</p>;
  if (!item) return <p className="p-6">게시글을 찾을 수 없습니다.</p>;

  return (
    <div className="p-6 space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={20} />
          <span>목록으로</span>
        </button>
        <div className="flex gap-2">
          {isEdit ? (
            <>
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                onClick={handleSave}
              >
                저장
              </button>
              <button
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                onClick={() => setIsEdit(false)}
              >
                취소
              </button>
            </>
          ) : (
            <button
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              onClick={() => setIsEdit(true)}
            >
              <Edit size={16} />
              수정
            </button>
          )}
          <button
            className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
            onClick={handleDelete}
          >
            <Trash2 size={16} />
            삭제
          </button>
        </div>
      </div>

      {/* 게시글 내용 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          {isEdit ? (
            <input
              type="text"
              className="w-full text-xl font-bold border border-gray-300 rounded-lg p-2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          ) : (
            <h2 className="text-xl font-bold text-gray-900">{item.title}</h2>
          )}
          <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
            <span>{item.writer_name || "-"}</span>
            <span>{formatKoreanDate(item.created_at)}</span>
            {item.board_name && (
              <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">
                {item.board_name}
              </span>
            )}
          </div>
        </div>

        <div className="p-6">
          {isEdit ? (
            <textarea
              className="w-full min-h-[300px] border border-gray-300 rounded-lg p-3"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          ) : (
            <div
              className="prose max-w-none"
              dangerouslySetInnerHTML={{ __html: item.content }}
            />
          )}
        </div>

        {/* 첨부파일 */}
        {item.files && item.files.length > 0 && (
          <div className="p-6 border-t border-gray-100 bg-gray-50">
            <h3 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
              <Paperclip size={16} />
              첨부파일 ({item.files.length})
            </h3>
            <div className="space-y-2">
              {item.files.map((file) => (
                <a
                  key={file.id}
                  href={file.file}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-blue-600 hover:underline text-sm"
                >
                  {file.file.split("/").pop()}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
