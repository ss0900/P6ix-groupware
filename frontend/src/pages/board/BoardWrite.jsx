// src/pages/board/BoardWrite.jsx
import React, { useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import BoardService from "../../api/board";
import api from "../../api/axios";
import BoardSelectModal from "./BoardSelectModal";
import { ArrowLeft, Paperclip, X } from "lucide-react";

export default function BoardWrite() {
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef(null);

  const [showModal, setShowModal] = useState(false);
  const [files, setFiles] = useState([]);

  const [form, setForm] = useState({
    board: location.state?.boardId || "",
    boardName: location.state?.boardName || "",
    title: "",
    content: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles((prev) => [...prev, ...selectedFiles]);
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!form.board) {
      alert("카테고리(게시판)를 선택해주세요.");
      return;
    }
    if (!form.title) {
      alert("제목을 입력해주세요.");
      return;
    }

    // 게시판 ID 처리
    let targetBoardId = form.board;

    const findBoardByName = async (targetName) => {
      const boards = await BoardService.getBoards();
      const find = (nodes) => {
        for (const node of nodes) {
          const name = node.name.replace(/\s+/g, "");
          const target = targetName.replace(/\s+/g, "");
          if (name === target) return node;
          if (node.sub_boards) {
            const found = find(node.sub_boards);
            if (found) return found;
          }
        }
        return null;
      };
      return find(Array.isArray(boards) ? boards : [boards]);
    };

    // 자유 게시판 처리
    if (targetBoardId === "free_placeholder") {
      try {
        const res = await api.post("/board/boards/", {
          name: "자유 게시판",
          description: "자유롭게 글을 쓸 수 있는 공간입니다.",
          board_type: "free",
        });
        targetBoardId = res.data.id;
      } catch (e) {
        if (e.response && e.response.status === 400) {
          const exists = await findBoardByName("자유 게시판");
          if (exists) {
            targetBoardId = exists.id;
          } else {
            alert("자유 게시판을 찾을 수 없습니다.");
            return;
          }
        } else {
          alert("자유 게시판 생성에 실패했습니다.");
          return;
        }
      }
    } else if (targetBoardId === "work") {
      // 업무 게시판 처리
      try {
        const res = await api.post("/board/boards/", {
          name: "업무 게시판",
          description: "업무 관련 게시판입니다.",
          board_type: "work",
        });
        targetBoardId = res.data.id;
      } catch (e) {
        if (e.response && e.response.status === 400) {
          const exists = await findBoardByName("업무 게시판");
          if (exists) {
            targetBoardId = exists.id;
          } else {
            alert("업무 게시판을 찾을 수 없습니다.");
            return;
          }
        } else {
          alert("업무 게시판 생성에 실패했습니다.");
          return;
        }
      }
    }

    const formData = new FormData();
    formData.append("board", targetBoardId);
    formData.append("title", form.title);
    formData.append("content", form.content);

    // 첨부파일 추가
    files.forEach((file) => {
      formData.append("files", file);
    });

    try {
      await api.post(`/board/posts/`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      alert("게시글이 등록되었습니다.");

      // 이동 경로 결정
      const isFreeBoard =
        form.boardName === "자유 게시판" || form.board === "free_placeholder";
      const isWorkBoardContext =
        form.board === "work" || form.boardName === "업무 게시판";

      if (isFreeBoard) {
        navigate(`/board/free`);
      } else if (isWorkBoardContext) {
        navigate(`/board/work-all`);
      } else if (targetBoardId && targetBoardId !== "free_placeholder" && targetBoardId !== "work") {
        navigate(`/board/${targetBoardId}`);
      } else {
        navigate(`/board/all`);
      }
    } catch (err) {
      console.error("Failed to create post", err);
      alert("게시글 등록에 실패했습니다.");
    }
  };

  return (
    <div className="p-6 space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={20} />
          <span>뒤로</span>
        </button>
        <h1 className="text-xl font-bold text-gray-900">게시글 작성</h1>
        <div className="w-20"></div>
      </div>

      {/* 폼 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        {/* 카테고리 선택 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            카테고리
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={form.boardName || ""}
              readOnly
              className="flex-1 p-2 border border-gray-300 rounded-lg bg-gray-50 cursor-pointer"
              placeholder="게시판 선택"
              onClick={() => setShowModal(true)}
            />
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200"
            >
              선택
            </button>
          </div>
        </div>

        {/* 제목 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            제목
          </label>
          <input
            name="title"
            value={form.title}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded-lg"
            placeholder="제목을 입력하세요"
          />
        </div>

        {/* 내용 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            내용
          </label>
          <textarea
            name="content"
            value={form.content}
            onChange={handleChange}
            className="w-full min-h-[300px] p-3 border border-gray-300 rounded-lg"
            placeholder="내용을 입력하세요"
          />
        </div>

        {/* 첨부파일 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            첨부파일
          </label>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            multiple
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Paperclip size={16} />
            파일 추가
          </button>
          {files.length > 0 && (
            <div className="mt-2 space-y-2">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                >
                  <span className="text-sm text-gray-700 truncate">
                    {file.name}
                  </span>
                  <button
                    onClick={() => removeFile(index)}
                    className="p-1 text-gray-400 hover:text-red-500"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 버튼 */}
        <div className="flex justify-end gap-2 pt-4">
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            작성 완료
          </button>
        </div>
      </div>

      <BoardSelectModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSelect={(node) => {
          setForm((prev) => ({
            ...prev,
            board: node.id,
            boardName: node.name,
          }));
        }}
      />
    </div>
  );
}
