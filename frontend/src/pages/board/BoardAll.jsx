// src/pages/board/BoardAll.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import BoardService from "../../api/board";
import { Search, Plus, FileText, ChevronRight } from "lucide-react";

export default function BoardAll({
  isMyPosts = false,
  isFreeBoard = false,
  isWorkBoard = false,
}) {
  const { boardId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(0);
  const [error, setError] = useState("");
  const [currentBoardName, setCurrentBoardName] = useState("");

  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [q, setQ] = useState("");
  const [searchField, setSearchField] = useState("title");
  const [searchTrigger, setSearchTrigger] = useState(0);

  const applySearch = () => {
    setPage(1);
    setSearchTrigger((v) => v + 1);
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");

        const user = JSON.parse(localStorage.getItem("user"));
        let targetBoardId = undefined;
        let boardName = "";

        // 자유 게시판 처리
        if (isFreeBoard) {
          boardName = "자유 게시판";
          const boards = await BoardService.getBoards();
          const findFree = (nodes) => {
            for (const node of nodes) {
              const name = node.name.replace(/\s+/g, "");
              if (name === "자유게시판") return node;
              if (node.sub_boards) {
                const found = findFree(node.sub_boards);
                if (found) return found;
              }
            }
            return null;
          };
          const freeBoard = findFree(Array.isArray(boards) ? boards : [boards]);
          if (freeBoard) {
            targetBoardId = freeBoard.id;
          } else {
            setRows([]);
            setCount(0);
            setCurrentBoardName(boardName);
            setLoading(false);
            return;
          }
        } else if (boardId && !isNaN(boardId)) {
          // 동적 게시판 (숫자 ID)
          targetBoardId = boardId;
          const boards = await BoardService.getBoards();
          const findBoard = (nodes, id) => {
            for (const node of nodes) {
              if (String(node.id) === String(id)) return node;
              if (node.sub_boards) {
                const found = findBoard(node.sub_boards, id);
                if (found) return found;
              }
            }
            return null;
          };
          const boardInfo = findBoard(
            Array.isArray(boards) ? boards : [boards],
            boardId
          );
          if (boardInfo) {
            boardName = boardInfo.name;
          }
        }

        setCurrentBoardName(boardName);

        const params = {
          page,
          page_size: pageSize,
          q: q.trim() || undefined,
          search_field: searchField,
          board_id: targetBoardId,
        };

        // 업무 게시판 페이지에서는 'free' 타입 제외
        if (isWorkBoard) {
          params.exclude_board_type = "free";
        }

        // 내가 쓴 글 필터
        if (isMyPosts && user) {
          params.writer_id = user.id;
        }

        const res = await BoardService.getPosts(params);
        const items = res?.results || res || [];
        setRows(items);
        setCount(res?.count ?? items.length);
      } catch (e) {
        console.error(e);
        setError("게시글을 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [page, pageSize, q, searchField, searchTrigger, isMyPosts, isFreeBoard, isWorkBoard, boardId]);

  const getPageTitle = () => {
    if (isMyPosts) return "내가 쓴 글";
    if (isFreeBoard) return "자유 게시판";
    if (isWorkBoard) return "업무 게시판";
    if (currentBoardName) return currentBoardName;
    return "전체 게시판";
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const handleWrite = () => {
    if (isFreeBoard) {
      navigate(`/board/new`, {
        state: { boardId: "free_placeholder", boardName: "자유 게시판" },
      });
    } else if (isWorkBoard) {
      navigate(`/board/new`, {
        state: { boardId: "work", boardName: "업무 게시판" },
      });
    } else if (boardId && !isNaN(boardId)) {
      navigate(`/board/new`, {
        state: { boardId: boardId, boardName: currentBoardName },
      });
    } else {
      navigate(`/board/new`);
    }
  };

  return (
    <div className="p-6 space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{getPageTitle()}</h1>
        <button
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          onClick={handleWrite}
        >
          <Plus size={18} />
          글쓰기
        </button>
      </div>

      {/* 검색 */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-100 flex gap-3">
          <select
            value={searchField}
            onChange={(e) => setSearchField(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="title">제목</option>
            <option value="content">내용</option>
            <option value="writer">작성자</option>
          </select>
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applySearch()}
              placeholder="검색어를 입력하세요..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <button
            onClick={applySearch}
            className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            검색
          </button>
        </div>

        {/* 테이블 */}
        <div className="divide-y divide-gray-100">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-500">{error}</div>
          ) : rows.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText size={48} className="mx-auto mb-4 text-gray-300" />
              <p>게시글이 없습니다.</p>
            </div>
          ) : (
            rows.map((row) => (
              <div
                key={row.id}
                onClick={() => navigate(`/board/view/${row.id}`)}
                className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {!isFreeBoard && !boardId && (
                        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                          {row.board_name || "-"}
                        </span>
                      )}
                      <span className="font-medium text-gray-900 truncate">
                        {row.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      <span>{row.writer_name || "-"}</span>
                      <span>{formatDate(row.created_at)}</span>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-gray-400 shrink-0" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 페이지네이션 */}
      {count > pageSize && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: Math.ceil(count / pageSize) }, (_, i) => (
            <button
              key={i + 1}
              onClick={() => setPage(i + 1)}
              className={`px-3 py-1 rounded ${
                page === i + 1
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 hover:bg-gray-200"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
