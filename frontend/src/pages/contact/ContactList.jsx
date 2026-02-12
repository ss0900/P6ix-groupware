// src/pages/contact/ContactList.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Mail,
  Star,
  Paperclip,
  Search,
  Send,
  Trash2,
  Eye,
  EyeOff,
  MessageCircle,
  ChevronRight,
  CheckSquare,
  Square,
  RotateCcw,
} from "lucide-react";
import ContactApi from "../../api/ContactApi";

// 폴더 경로 → API folder 파라미터 매핑
const FOLDER_MAP = {
  "all": "all",
  "": "all",
  received: "received",
  sent: "sent",
  draft: "draft",
  self: "self",
  trash: "trash",
};

// 폴더별 한글명
const FOLDER_NAMES = {
  all: "전체함",
  received: "수신함",
  sent: "송신함",
  draft: "임시보관함",
  self: "내게 쓴 글",
  trash: "휴지통",
};

export default function ContactList() {
  const navigate = useNavigate();
  const location = useLocation();

  // 현재 폴더 파악
  const pathParts = location.pathname.split("/").filter(Boolean);
  const currentPath = pathParts.length > 1 ? pathParts[1] : "";
  const folder = FOLDER_MAP[currentPath] || "all";
  const folderName = FOLDER_NAMES[folder];

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [folderCounts, setFolderCounts] = useState({});
  const [selectedIds, setSelectedIds] = useState([]);

  // 메시지 목록 로드
  const loadMessages = useCallback(async () => {
    setLoading(true);
    try {
      const params = { folder };
      if (searchQuery) params.search = searchQuery;
      const data = await ContactApi.getMessages(params);
      setMessages(data?.results ?? data ?? []);
    } catch (err) {
      console.error("Failed to load messages:", err);
    } finally {
      setLoading(false);
    }
  }, [folder, searchQuery]);

  // 폴더 카운트 로드
  const loadFolderCounts = useCallback(async () => {
    try {
      const data = await ContactApi.getFolderCounts();
      setFolderCounts(data);
    } catch (err) {
      console.error("Failed to load folder counts:", err);
    }
  }, []);

  useEffect(() => {
    loadMessages();
    loadFolderCounts();
  }, [loadMessages, loadFolderCounts]);

  // 선택 토글
  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // 전체 선택/해제
  const toggleSelectAll = () => {
    if (selectedIds.length === messages.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(messages.map((m) => m.id));
    }
  };

  // 별표 토글
  const handleToggleStar = async (e, id) => {
    e.stopPropagation();
    try {
      await ContactApi.toggleStar(id);
      loadMessages();
    } catch (err) {
      console.error("Failed to toggle star:", err);
    }
  };

  // 일괄 삭제
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    try {
      await Promise.all(selectedIds.map((id) => ContactApi.moveToTrash(id)));
      setSelectedIds([]);
      loadMessages();
      loadFolderCounts();
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  };

  // 일괄 복원
  const handleBulkRestore = async () => {
    if (selectedIds.length === 0) return;
    try {
      await Promise.all(selectedIds.map((id) => ContactApi.restoreMessage(id)));
      setSelectedIds([]);
      loadMessages();
      loadFolderCounts();
    } catch (err) {
      console.error("Failed to restore:", err);
    }
  };

  // 일괄 읽음 처리
  const handleBulkMarkRead = async () => {
    if (selectedIds.length === 0) return;
    try {
      await Promise.all(selectedIds.map((id) => ContactApi.markAsRead(id)));
      setSelectedIds([]);
      loadMessages();
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  };

  // 날짜+시간 포맷 (YYYY/MM/DD HH:mm)
  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}/${month}/${day} ${hours}:${minutes}`;
  };

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{folderName}</h1>
        <button
          onClick={() => navigate("/contact/new")}
          className="flex items-center gap-2 px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors"
        >
          <Send size={18} />
          업무연락 보내기
        </button>
      </div>

      {/* 검색 및 액션 바 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-4">
          {/* 검색 */}
          <div className="relative flex-1 max-w-md">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="제목, 보낸이 검색..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
            />
          </div>

          {/* 액션 버튼 */}
          <div className="flex items-center gap-2">
            {folder === "received" && (
              <button
                onClick={handleBulkMarkRead}
                disabled={selectedIds.length === 0}
                className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Eye size={16} />
                읽음
              </button>
            )}
            {folder === "trash" ? (
              <button
                onClick={handleBulkRestore}
                disabled={selectedIds.length === 0}
                className="flex items-center gap-1 px-3 py-2 text-sm text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RotateCcw size={16} />
                복원
              </button>
            ) : (
              <button
                onClick={handleBulkDelete}
                disabled={selectedIds.length === 0}
                className="flex items-center gap-1 px-3 py-2 text-sm text-red-600 bg-red-50 rounded-lg hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 size={16} />
                삭제
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 메시지 목록 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* 테이블 헤더 */}
        <div className="flex items-center px-4 py-3 bg-gray-50 border-b border-gray-200 text-sm text-gray-600 font-medium">
          <div className="w-10 flex justify-center">
            <button onClick={toggleSelectAll} className="text-gray-400 hover:text-gray-600">
              {selectedIds.length === messages.length && messages.length > 0 ? (
                <CheckSquare size={18} />
              ) : (
                <Square size={18} />
              )}
            </button>
          </div>
          <div className="w-12 text-center">번호</div>
          <div className="w-10 text-center">
            <Star size={16} className="inline text-gray-400" />
          </div>
          <div className="flex-1">제목</div>
          <div className="w-10 text-center">
            <Paperclip size={16} className="inline text-gray-400" />
          </div>
          <div className="w-24 text-center">보낸이</div>
          <div className="w-32 text-center">받는이</div>
          <div className="w-36 text-center whitespace-nowrap">보낸시간</div>
          <div className="w-36 text-center whitespace-nowrap">최근변경</div>
        </div>

        {/* 메시지 목록 */}
        <div className="divide-y divide-gray-100">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-sky-500 border-t-transparent"></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Mail size={48} className="mx-auto mb-4 text-gray-300" />
              <p>메시지가 없습니다.</p>
            </div>
          ) : (
            messages.map((msg, index) => (
              <div
                key={msg.id}
                className={`flex items-center px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors ${
                  selectedIds.includes(msg.id) ? "bg-sky-50" : ""
                }`}
              >
                {/* 체크박스 */}
                <div className="w-10 flex justify-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelect(msg.id);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    {selectedIds.includes(msg.id) ? (
                      <CheckSquare size={18} className="text-sky-500" />
                    ) : (
                      <Square size={18} />
                    )}
                  </button>
                </div>

                {/* 번호 */}
                <div className="w-12 text-center text-sm text-gray-500">{index + 1}</div>

                {/* 별표 */}
                <div className="w-10 text-center">
                  <button
                    onClick={(e) => handleToggleStar(e, msg.id)}
                    className="text-gray-300 hover:text-yellow-400"
                  >
                    <Star
                      size={18}
                      className={msg.is_starred ? "text-yellow-400 fill-yellow-400" : ""}
                    />
                  </button>
                </div>

                {/* 제목 */}
                <div
                  className="flex-1 truncate"
                  onClick={() => navigate(`/contact/${msg.id}`)}
                >
                  <span className="font-medium text-gray-900">{msg.title}</span>
                  {msg.comment_count > 0 && (
                    <span className="ml-2 text-sky-500 text-sm">
                      [{msg.comment_count}]
                    </span>
                  )}
                  {msg.is_draft && (
                    <span className="ml-2 text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">
                      임시저장
                    </span>
                  )}
                </div>

                {/* 첨부 */}
                <div className="w-10 text-center">
                  {msg.has_attachments && (
                    <Paperclip size={16} className="inline text-gray-400" />
                  )}
                </div>

                {/* 보낸이 */}
                <div className="w-24 text-center text-sm text-gray-600 truncate">
                  {msg.sender?.full_name || msg.sender?.username || "-"}
                </div>

                {/* 받는이 */}
                <div className="w-32 text-center text-sm text-gray-600">
                  {(() => {
                    const recipientNameList = (msg.recipient_names || "")
                      .split(",")
                      .map((name) => name.trim())
                      .filter(Boolean);
                    const primaryRecipient = recipientNameList[0] || "-";
                    const hasMultipleRecipients =
                      Number(msg.total_recipients || 0) > 1 || recipientNameList.length > 1;
                    const totalRecipients =
                      Number(msg.total_recipients || recipientNameList.length || 0);
                    const displayName = hasMultipleRecipients
                      ? `${primaryRecipient}+`
                      : primaryRecipient;

                    return (
                      <span className="inline-flex items-center gap-1 whitespace-nowrap">
                        <span>{displayName}</span>
                        <span className="text-sky-600">
                          [{msg.read_count || 0}/{totalRecipients}]
                        </span>
                      </span>
                    );
                  })()}
                </div>

                {/* 보낸 시간 */}
                <div className="w-36 text-center text-sm text-gray-500 whitespace-nowrap">
                  {formatDate(msg.created_at)}
                </div>

                {/* 최근 변경 */}
                <div className="w-36 text-center text-sm text-gray-500 whitespace-nowrap">
                  {formatDate(msg.updated_at)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
