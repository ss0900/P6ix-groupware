// src/pages/contact/ContactForm.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Send,
  Save,
  X,
  Paperclip,
  User,
  Plus,
  Trash2,
} from "lucide-react";
import api from "../../api/axios";
import ContactApi from "../../api/ContactApi";

export default function ContactForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [recipientIds, setRecipientIds] = useState([]);
  const [isToSelf, setIsToSelf] = useState(false);
  const [files, setFiles] = useState([]);
  const [existingAttachments, setExistingAttachments] = useState([]);

  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState("");
  const [showUserList, setShowUserList] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 사용자 목록 로드
  const loadUsers = useCallback(async () => {
    try {
      const res = await api.get("core/users/");
      setUsers(res.data?.results ?? res.data ?? []);
    } catch (err) {
      console.error("Failed to load users:", err);
    }
  }, []);

  // 기존 메시지 로드 (편집 모드)
  const loadMessage = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await ContactApi.getMessage(id);
      setTitle(data.title);
      setContent(data.content);
      setIsToSelf(data.is_to_self);
      setRecipientIds(data.recipients?.map((r) => r.recipient.id) || []);
      setExistingAttachments(data.attachments || []);
    } catch (err) {
      console.error("Failed to load message:", err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadUsers();
    loadMessage();
  }, [loadUsers, loadMessage]);

  // 수신자 추가
  const addRecipient = (userId) => {
    if (!recipientIds.includes(userId)) {
      setRecipientIds([...recipientIds, userId]);
    }
    setUserSearch("");
    setShowUserList(false);
  };

  // 수신자 제거
  const removeRecipient = (userId) => {
    setRecipientIds(recipientIds.filter((id) => id !== userId));
  };

  // 선택된 수신자 이름
  const getRecipientName = (userId) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return `User ${userId}`;
    return `${user.last_name}${user.first_name}`.trim() || user.username;
  };

  // 필터된 사용자 목록
  const filteredUsers = users.filter((u) => {
    if (recipientIds.includes(u.id)) return false;
    const name = `${u.last_name}${u.first_name} ${u.username}`.toLowerCase();
    return name.includes(userSearch.toLowerCase());
  });

  // 파일 선택
  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files);
    setFiles([...files, ...newFiles]);
    e.target.value = "";
  };

  // 파일 제거
  const removeFile = (index) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  // 제출
  const handleSubmit = async (isDraft = false) => {
    if (!title.trim()) {
      alert("제목을 입력해주세요.");
      return;
    }
    if (!isToSelf && recipientIds.length === 0 && !isDraft) {
      alert("수신자를 선택해주세요.");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("content", content);
      formData.append("is_draft", isDraft);
      formData.append("is_to_self", isToSelf);

      if (!isToSelf) {
        recipientIds.forEach((rid) => {
          formData.append("recipient_ids", rid);
        });
      }

      files.forEach((file) => {
        formData.append("attachments", file);
      });

      if (isEdit) {
        await ContactApi.updateMessage(id, formData);
      } else {
        await ContactApi.createMessage(formData);
      }

      navigate(isDraft ? "/contact/draft" : "/contact/sent");
    } catch (err) {
      console.error("Failed to submit:", err);
      alert("저장에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-sky-500 border-t-transparent"></div>
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
          <span>취소</span>
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSubmit(true)}
            disabled={submitting}
            className="flex items-center gap-1 px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
          >
            <Save size={16} />
            임시저장
          </button>
          <button
            onClick={() => handleSubmit(false)}
            disabled={submitting}
            className="flex items-center gap-1 px-4 py-2 text-sm text-white bg-sky-500 rounded-lg hover:bg-sky-600 disabled:opacity-50"
          >
            <Send size={16} />
            보내기
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* 내게 쓴 글 토글 */}
        <div className="flex items-center gap-4 p-4 border-b border-gray-100 bg-gray-50">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isToSelf}
              onChange={(e) => {
                setIsToSelf(e.target.checked);
                if (e.target.checked) setRecipientIds([]);
              }}
              className="w-4 h-4 text-sky-500 rounded focus:ring-sky-500"
            />
            <span className="text-sm text-gray-700">내게 쓴 글</span>
          </label>
        </div>

        {/* 수신자 선택 */}
        {!isToSelf && (
          <div className="p-4 border-b border-gray-100">
            <div className="text-sm text-gray-600 mb-2">수신자</div>
            <div className="flex flex-wrap gap-2 mb-2">
              {recipientIds.map((uid) => (
                <span
                  key={uid}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-sky-100 text-sky-700 rounded text-sm"
                >
                  {getRecipientName(uid)}
                  <button
                    onClick={() => removeRecipient(uid)}
                    className="text-sky-500 hover:text-sky-700"
                  >
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
            <div className="relative">
              <input
                type="text"
                value={userSearch}
                onChange={(e) => {
                  setUserSearch(e.target.value);
                  setShowUserList(true);
                }}
                onFocus={() => setShowUserList(true)}
                placeholder="수신자 검색..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
              />
              {showUserList && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {filteredUsers.length > 0 ? (
                    filteredUsers.slice(0, 10).map((user) => (
                      <button
                        key={user.id}
                        onClick={() => addRecipient(user.id)}
                        className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
                      >
                        <User size={16} className="text-gray-400" />
                        <span>
                          {`${user.last_name}${user.first_name}`.trim() || user.username}
                        </span>
                        <span className="text-gray-400 text-sm">({user.username})</span>
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-gray-500 text-sm">검색 결과가 없습니다</div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 제목 */}
        <div className="p-4 border-b border-gray-100">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목을 입력하세요"
            className="w-full text-lg font-medium focus:outline-none"
          />
        </div>

        {/* 내용 */}
        <div className="p-4">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="내용을 입력하세요..."
            rows={12}
            className="w-full resize-none focus:outline-none"
          />
        </div>

        {/* 기존 첨부파일 (편집 모드) */}
        {existingAttachments.length > 0 && (
          <div className="p-4 border-t border-gray-100 bg-gray-50">
            <div className="text-sm text-gray-600 mb-2">기존 첨부파일</div>
            <div className="space-y-2">
              {existingAttachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-gray-200"
                >
                  <Paperclip size={16} className="text-gray-400" />
                  <span className="flex-1 text-sm">{att.original_name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 새 첨부파일 */}
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <Paperclip size={16} className="text-gray-400" />
            <span className="text-sm text-gray-600">첨부파일</span>
            <label className="cursor-pointer">
              <input
                type="file"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
              <span className="flex items-center gap-1 px-2 py-1 text-xs text-sky-600 bg-sky-50 rounded hover:bg-sky-100">
                <Plus size={14} />
                파일 추가
              </span>
            </label>
          </div>
          {files.length > 0 && (
            <div className="space-y-2">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg"
                >
                  <Paperclip size={16} className="text-gray-400" />
                  <span className="flex-1 text-sm">{file.name}</span>
                  <span className="text-xs text-gray-400">
                    {(file.size / 1024).toFixed(1)} KB
                  </span>
                  <button
                    onClick={() => removeFile(index)}
                    className="text-red-400 hover:text-red-600"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
