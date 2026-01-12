// src/pages/board/BoardList.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../../api/axios";
import { 
  MessageSquare, 
  FileText, 
  Pin, 
  Search, 
  Plus,
  Eye,
  MessageCircle,
  Paperclip,
  ChevronRight
} from "lucide-react";

export default function BoardList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [boards, setBoards] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const selectedBoard = searchParams.get("board") || "";

  // 게시판 목록 로드
  const loadBoards = useCallback(async () => {
    try {
      const res = await api.get("board/boards/");
      setBoards(res.data?.results ?? res.data ?? []);
    } catch (err) {
      console.error("Failed to load boards:", err);
    }
  }, []);

  // 게시글 목록 로드
  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      let url = "board/posts/";
      const params = new URLSearchParams();
      if (selectedBoard) params.append("board", selectedBoard);
      if (searchQuery) params.append("search", searchQuery);
      if (params.toString()) url += `?${params.toString()}`;

      const res = await api.get(url);
      setPosts(res.data?.results ?? res.data ?? []);
    } catch (err) {
      console.error("Failed to load posts:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedBoard, searchQuery]);

  useEffect(() => {
    loadBoards();
  }, [loadBoards]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  // 게시판 변경
  const handleBoardChange = (slug) => {
    if (slug) {
      setSearchParams({ board: slug });
    } else {
      setSearchParams({});
    }
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">게시판</h1>
        <button
          onClick={() => navigate("/board/new")}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={18} />
          글쓰기
        </button>
      </div>

      <div className="grid grid-cols-4 gap-6">
        {/* 왼쪽: 게시판 목록 */}
        <div className="col-span-1">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <MessageSquare size={18} />
              게시판 목록
            </h2>
            <div className="space-y-1">
              <button
                onClick={() => handleBoardChange("")}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                  !selectedBoard ? "bg-blue-50 text-blue-600" : "hover:bg-gray-50"
                }`}
              >
                전체 게시판
              </button>
              {boards.map((board) => (
                <button
                  key={board.id}
                  onClick={() => handleBoardChange(board.slug)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between ${
                    selectedBoard === board.slug ? "bg-blue-50 text-blue-600" : "hover:bg-gray-50"
                  }`}
                >
                  <span>{board.name}</span>
                  <span className="text-xs text-gray-400">{board.post_count}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 오른쪽: 게시글 목록 */}
        <div className="col-span-3">
          <div className="bg-white rounded-xl border border-gray-200">
            {/* 검색 */}
            <div className="p-4 border-b border-gray-100">
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="제목 검색..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
            </div>

            {/* 게시글 목록 */}
            <div className="divide-y divide-gray-100">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
                </div>
              ) : posts.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <FileText size={48} className="mx-auto mb-4 text-gray-300" />
                  <p>게시글이 없습니다.</p>
                </div>
              ) : (
                posts.map((post) => (
                  <div
                    key={post.id}
                    onClick={() => navigate(`/board/${post.id}`)}
                    className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      {/* 공지 아이콘 */}
                      {post.is_notice && (
                        <div className="p-2 bg-red-100 rounded-lg shrink-0">
                          <Pin size={16} className="text-red-600" />
                        </div>
                      )}

                      {/* 내용 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {!selectedBoard && (
                            <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                              {post.board_name}
                            </span>
                          )}
                          <span className="font-medium text-gray-900 truncate">{post.title}</span>
                          {post.is_secret && (
                            <span className="text-xs px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded">🔒</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-500">
                          <span>{post.author_name}</span>
                          <span>{new Date(post.created_at).toLocaleDateString('ko-KR')}</span>
                        </div>
                      </div>

                      {/* 통계 */}
                      <div className="flex items-center gap-4 text-sm text-gray-400 shrink-0">
                        <span className="flex items-center gap-1">
                          <Eye size={14} />
                          {post.view_count}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle size={14} />
                          {post.comment_count}
                        </span>
                        {post.attachment_count > 0 && (
                          <span className="flex items-center gap-1">
                            <Paperclip size={14} />
                            {post.attachment_count}
                          </span>
                        )}
                        <ChevronRight size={16} />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
