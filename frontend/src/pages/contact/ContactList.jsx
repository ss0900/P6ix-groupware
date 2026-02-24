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
  CheckSquare,
  Square,
  RotateCcw,
  X,
  ChevronDown,
} from "lucide-react";
import ContactApi from "../../api/ContactApi";

const FOLDER_MAP = {
  all: "all",
  "": "all",
  received: "received",
  sent: "sent",
  draft: "draft",
  self: "self",
  trash: "trash",
};

const FOLDER_NAMES = {
  all: "전체함",
  received: "수신함",
  sent: "송신함",
  draft: "임시보관함",
  self: "내게 쓴 글",
  trash: "휴지통",
};

const RECEIPT_PAGE_SIZE = 10;

const formatModalDateTime = (dateStr) => {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}`;
};

const parseDateOrZero = (dateStr) => {
  if (!dateStr) return 0;
  const value = new Date(dateStr).getTime();
  return Number.isNaN(value) ? 0 : value;
};

function ReceiptStatusModal({
  isOpen,
  loading,
  detail,
  error,
  page,
  sortDesc,
  onClose,
  onPageChange,
  onToggleSort,
}) {
  if (!isOpen) return null;

  const recipients = detail?.recipients || [];
  const totalRecipients = detail?.total_recipients || recipients.length || 0;
  const updatedAtValue = parseDateOrZero(detail?.updated_at);

  const sentConfirmedCount = recipients.filter((recipient) => recipient.is_read).length;
  const changedConfirmedCount = recipients.filter((recipient) => {
    if (!recipient.read_at || !updatedAtValue) return false;
    return parseDateOrZero(recipient.read_at) >= updatedAtValue;
  }).length;

  const sortedRecipients = [...recipients].sort((a, b) => {
    const aTime = parseDateOrZero(a.read_at);
    const bTime = parseDateOrZero(b.read_at);
    if (aTime === bTime) return 0;
    return sortDesc ? bTime - aTime : aTime - bTime;
  });

  const totalPages = Math.max(1, Math.ceil(sortedRecipients.length / RECEIPT_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * RECEIPT_PAGE_SIZE;
  const pageRecipients = sortedRecipients.slice(startIndex, startIndex + RECEIPT_PAGE_SIZE);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-5xl mx-4 max-h-[90vh] bg-white rounded-xl border border-gray-200 shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">수신 확인</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div className="py-20 flex items-center justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-sky-500 border-t-transparent" />
          </div>
        ) : error ? (
          <div className="p-6 text-sm text-red-600">{error}</div>
        ) : (
          <>
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/60">
              <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                <div className="grid grid-cols-[88px_1fr] border-b border-gray-100">
                  <div className="px-4 py-3 bg-gray-50 text-sm font-semibold text-gray-700">
                    제목
                  </div>
                  <div className="px-4 py-3 text-sm font-medium text-gray-900">
                    {detail?.title || "-"}
                  </div>
                </div>

                <div className="grid grid-cols-[88px_1fr]">
                  <div className="px-4 py-3 bg-gray-50 text-sm font-semibold text-gray-700">
                    시간
                  </div>
                  <div className="px-4 py-3 text-sm text-gray-700">
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
                      <span>
                        <span className="text-gray-500">등록 :</span>{" "}
                        {formatModalDateTime(detail?.created_at)}
                      </span>
                      <span>
                        <span className="text-gray-500">변경 :</span>{" "}
                        {formatModalDateTime(detail?.updated_at)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 flex-1 min-h-0">
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="grid grid-cols-[100px_1fr_200px_220px] bg-gray-50 border-b border-gray-200 text-sm text-gray-700 font-medium">
                  <div className="px-3 py-2 text-center">구분</div>
                  <div className="px-3 py-2">이름</div>
                  <div className="px-3 py-2 text-center">
                    보낸글 확인 [{sentConfirmedCount}/{totalRecipients}]
                  </div>
                  <button
                    type="button"
                    onClick={onToggleSort}
                    className="px-3 py-2 text-center inline-flex items-center justify-center gap-1 hover:bg-gray-100"
                  >
                    변경글 확인 [{changedConfirmedCount}/{totalRecipients}]
                    <ChevronDown
                      size={14}
                      className={`transition-transform ${sortDesc ? "" : "rotate-180"}`}
                    />
                  </button>
                </div>

                <div className="max-h-80 overflow-y-auto">
                  {pageRecipients.length === 0 ? (
                    <div className="px-4 py-10 text-center text-sm text-gray-500">
                      수신자 데이터가 없습니다.
                    </div>
                  ) : (
                    pageRecipients.map((recipient) => {
                      const recipientName =
                        recipient.recipient?.full_name || recipient.recipient?.username || "-";
                      const sentReadAt = recipient.is_read
                        ? formatModalDateTime(recipient.read_at)
                        : "-";
                      const changedReadAt =
                        recipient.read_at &&
                        updatedAtValue &&
                        parseDateOrZero(recipient.read_at) >= updatedAtValue
                          ? formatModalDateTime(recipient.read_at)
                          : "-";

                      return (
                        <div
                          key={recipient.id}
                          className="grid grid-cols-[100px_1fr_200px_220px] text-sm border-b last:border-b-0 border-gray-100"
                        >
                          <div className="px-3 py-2 text-center text-gray-600">받는이</div>
                          <div className="px-3 py-2 text-sky-600">{recipientName}</div>
                          <div className="px-3 py-2 text-center text-gray-700 whitespace-nowrap">
                            {sentReadAt}
                          </div>
                          <div className="px-3 py-2 text-center text-gray-700 whitespace-nowrap">
                            {changedReadAt}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="mt-4 relative flex items-center justify-center min-h-9">
                <button
                  onClick={onClose}
                  className="absolute left-0 px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  닫기
                </button>

                <div className="flex items-center gap-1 text-sm">
                  {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pageNumber) => (
                    <button
                      key={pageNumber}
                      onClick={() => onPageChange(pageNumber)}
                      className={`w-8 h-8 rounded ${
                        safePage === pageNumber
                          ? "text-sky-600 font-semibold"
                          : "text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      {pageNumber}
                    </button>
                  ))}
                  <button
                    onClick={() => onPageChange(Math.min(totalPages, safePage + 1))}
                    disabled={safePage >= totalPages}
                    className="w-8 h-8 rounded text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent"
                  >
                    {">"}
                  </button>
                  <button
                    onClick={() => onPageChange(totalPages)}
                    disabled={safePage >= totalPages}
                    className="w-8 h-8 rounded text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent"
                  >
                    {">>"}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function ContactList() {
  const navigate = useNavigate();
  const location = useLocation();

  const pathParts = location.pathname.split("/").filter(Boolean);
  const currentPath = pathParts.length > 1 ? pathParts[1] : "";
  const folder = FOLDER_MAP[currentPath] || "all";
  const folderName = FOLDER_NAMES[folder];

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);

  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [receiptModalLoading, setReceiptModalLoading] = useState(false);
  const [receiptModalError, setReceiptModalError] = useState("");
  const [receiptModalDetail, setReceiptModalDetail] = useState(null);
  const [receiptModalPage, setReceiptModalPage] = useState(1);
  const [receiptModalSortDesc, setReceiptModalSortDesc] = useState(true);

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

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id],
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === messages.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(messages.map((message) => message.id));
    }
  };

  const handleToggleStar = async (event, id) => {
    event.stopPropagation();
    try {
      await ContactApi.toggleStar(id);
      loadMessages();
    } catch (err) {
      console.error("Failed to toggle star:", err);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    try {
      await Promise.all(selectedIds.map((id) => ContactApi.moveToTrash(id)));
      setSelectedIds([]);
      loadMessages();
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  };

  const handleBulkRestore = async () => {
    if (selectedIds.length === 0) return;
    try {
      await Promise.all(selectedIds.map((id) => ContactApi.restoreMessage(id)));
      setSelectedIds([]);
      loadMessages();
    } catch (err) {
      console.error("Failed to restore:", err);
    }
  };

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

  const openReceiptModal = async (event, messageId) => {
    event.stopPropagation();
    setReceiptModalOpen(true);
    setReceiptModalLoading(true);
    setReceiptModalError("");
    setReceiptModalDetail(null);
    setReceiptModalPage(1);
    setReceiptModalSortDesc(true);

    try {
      const data = await ContactApi.getMessage(messageId);
      setReceiptModalDetail(data);
    } catch (err) {
      console.error("Failed to load receipt detail:", err);
      setReceiptModalError("수신 확인 정보를 불러오지 못했습니다.");
    } finally {
      setReceiptModalLoading(false);
    }
  };

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

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="제목, 보낸이 검색..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
            />
          </div>

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

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
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

        <div className="divide-y divide-gray-100">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-sky-500 border-t-transparent" />
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
                <div className="w-10 flex justify-center">
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
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

                <div className="w-12 text-center text-sm text-gray-500">{index + 1}</div>

                <div className="w-10 text-center">
                  <button
                    onClick={(event) => handleToggleStar(event, msg.id)}
                    className="text-gray-300 hover:text-yellow-400"
                  >
                    <Star
                      size={18}
                      className={msg.is_starred ? "text-yellow-400 fill-yellow-400" : ""}
                    />
                  </button>
                </div>

                <div className="flex-1 truncate" onClick={() => navigate(`/contact/${msg.id}`)}>
                  <span className="font-medium text-gray-900">{msg.title}</span>
                  {msg.comment_count > 0 && (
                    <span className="ml-2 text-sky-500 text-sm">[{msg.comment_count}]</span>
                  )}
                  {msg.is_draft && (
                    <span className="ml-2 text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">
                      임시저장
                    </span>
                  )}
                </div>

                <div className="w-10 text-center">
                  {msg.has_attachments && (
                    <Paperclip size={16} className="inline text-gray-400" />
                  )}
                </div>

                <div className="w-24 text-center text-sm text-gray-600 truncate">
                  {msg.sender?.full_name || msg.sender?.username || "-"}
                </div>

                <div className="w-32 text-center text-sm text-gray-600">
                  {(() => {
                    const recipientNameList = (msg.recipient_names || "")
                      .split(",")
                      .map((name) => name.trim())
                      .filter(Boolean);
                    const primaryRecipient = recipientNameList[0] || "-";
                    const hasMultipleRecipients =
                      Number(msg.total_recipients || 0) > 1 || recipientNameList.length > 1;
                    const totalRecipients = Number(
                      msg.total_recipients || recipientNameList.length || 0,
                    );
                    const displayName = hasMultipleRecipients
                      ? `${primaryRecipient}+`
                      : primaryRecipient;

                    return (
                      <span className="inline-flex items-center gap-1 whitespace-nowrap">
                        <span>{displayName}</span>
                        <button
                          type="button"
                          onClick={(event) => openReceiptModal(event, msg.id)}
                          className="text-sky-600 hover:underline"
                        >
                          [{msg.read_count || 0}/{totalRecipients}]
                        </button>
                      </span>
                    );
                  })()}
                </div>

                <div className="w-36 text-center text-sm text-gray-500 whitespace-nowrap">
                  {formatDate(msg.created_at)}
                </div>

                <div className="w-36 text-center text-sm text-gray-500 whitespace-nowrap">
                  {formatDate(msg.updated_at)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <ReceiptStatusModal
        isOpen={receiptModalOpen}
        loading={receiptModalLoading}
        detail={receiptModalDetail}
        error={receiptModalError}
        page={receiptModalPage}
        sortDesc={receiptModalSortDesc}
        onClose={() => setReceiptModalOpen(false)}
        onPageChange={(nextPage) => setReceiptModalPage(nextPage)}
        onToggleSort={() => setReceiptModalSortDesc((prev) => !prev)}
      />
    </div>
  );
}