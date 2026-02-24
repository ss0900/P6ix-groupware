// src/pages/board/PostForm.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/axios";
import { ArrowLeft, Save } from "lucide-react";

export default function PostForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [boards, setBoards] = useState([]);

  const [formData, setFormData] = useState({
    board: "",
    title: "",
    content: "",
    is_notice: false,
    is_secret: false,
  });

  // 게시판 목록 로드
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("board/boards/");
        const list = res.data?.results ?? res.data ?? [];
        setBoards(list);
        if (list.length > 0 && !formData.board) {
          setFormData((prev) => ({ ...prev, board: list[0].id }));
        }
      } catch (err) {
        console.error(err);
      }
    })();
  }, []);

  // 편집 모드: 게시글 로드
  useEffect(() => {
    if (!isEdit) return;

    setLoading(true);
    (async () => {
      try {
        const res = await api.get(`board/posts/${id}/`);
        const post = res.data;
        setFormData({
          board: post.board,
          title: post.title || "",
          content: post.content || "",
          is_notice: post.is_notice || false,
          is_secret: post.is_secret || false,
        });
      } catch (err) {
        console.error(err);
        alert("게시글을 불러올 수 없습니다.");
        navigate("/board");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isEdit, navigate]);

  // 저장
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      alert("제목을 입력해주세요.");
      return;
    }

    if (!formData.content.trim()) {
      alert("내용을 입력해주세요.");
      return;
    }

    setSaving(true);
    try {
      if (isEdit) {
        await api.patch(`board/posts/${id}/`, formData);
      } else {
        await api.post("board/posts/", formData);
      }
      navigate("/board");
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
    <div className="max-w-3xl mx-auto space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/board")}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEdit ? "게시글 수정" : "글쓰기"}
        </h1>
      </div>

      {/* 폼 */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl border border-gray-200 p-6 space-y-6"
      >
        {/* 게시판 선택 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            게시판 *
          </label>
          <select
            value={formData.board}
            onChange={(e) =>
              setFormData({ ...formData, board: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            required
          >
            {boards.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        {/* 제목 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            제목 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) =>
              setFormData({ ...formData, title: e.target.value })
            }
            placeholder="제목을 입력하세요"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            required
          />
        </div>

        {/* 내용 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            내용 *
          </label>
          <textarea
            value={formData.content}
            onChange={(e) =>
              setFormData({ ...formData, content: e.target.value })
            }
            placeholder="내용을 입력하세요"
            rows={15}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            required
          />
        </div>

        {/* 옵션 */}
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.is_notice}
              onChange={(e) =>
                setFormData({ ...formData, is_notice: e.target.checked })
              }
              className="w-4 h-4 rounded border-gray-300 text-blue-600"
            />
            <span className="text-sm text-gray-700">공지로 등록</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.is_secret}
              onChange={(e) =>
                setFormData({ ...formData, is_secret: e.target.checked })
              }
              className="w-4 h-4 rounded border-gray-300 text-blue-600"
            />
            <span className="text-sm text-gray-700">비밀글</span>
          </label>
        </div>

        {/* 버튼 */}
        <div className="flex gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={() => navigate("/board")}
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium"
          >
            <Save size={18} />
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </form>
    </div>
  );
}
