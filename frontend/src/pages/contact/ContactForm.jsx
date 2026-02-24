// src/pages/contact/ContactForm.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Send,
  Save,
  X,
  Paperclip,
  Plus,
  Trash2,
  Search,
  Users,
  UserPlus,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import api from "../../api/axios";
import ContactApi from "../../api/ContactApi";
import { useAuth } from "../../context/AuthContext";

const getUserDisplayName = (user) =>
  `${user?.last_name || ""}${user?.first_name || ""}`.trim() ||
  user?.username ||
  "";

const getUserCompanyName = (user) =>
  user?.primary_membership?.company_name ||
  user?.company?.name ||
  user?.company_name ||
  "미지정 회사";

const getUserDepartmentName = (user) =>
  user?.primary_membership?.department_name ||
  user?.department?.name ||
  user?.department_name ||
  "";

const getUserPositionName = (user) =>
  user?.primary_membership?.position_name ||
  user?.position?.name ||
  user?.position_name ||
  "";

const getUserPositionId = (user) =>
  user?.primary_membership?.position_id ||
  user?.position?.id ||
  user?.position_id ||
  null;

const getUserPositionLevel = (user, positionLevelById = {}) => {
  const directLevel = Number(
    user?.primary_membership?.position_level ??
      user?.position?.level ??
      user?.position_level,
  );
  if (Number.isFinite(directLevel)) return directLevel;

  const positionId = getUserPositionId(user);
  if (positionId != null) {
    const mappedLevel = Number(positionLevelById[String(positionId)]);
    if (Number.isFinite(mappedLevel)) return mappedLevel;
  }

  return Number.MAX_SAFE_INTEGER;
};

const userNameCollator = new Intl.Collator("ko", {
  sensitivity: "base",
  numeric: true,
});

const compareUsersByPositionThenName = (a, b, positionLevelById) => {
  const aLevel = getUserPositionLevel(a, positionLevelById);
  const bLevel = getUserPositionLevel(b, positionLevelById);
  if (aLevel !== bLevel) return aLevel - bLevel;

  const nameCompare = userNameCollator.compare(
    getUserDisplayName(a),
    getUserDisplayName(b),
  );
  if (nameCompare !== 0) return nameCompare;

  return userNameCollator.compare(a?.username || "", b?.username || "");
};

const getUserSearchText = (user) => {
  const fields = [
    getUserDisplayName(user),
    user?.username || "",
    getUserCompanyName(user),
    getUserDepartmentName(user),
    getUserPositionName(user),
  ];
  return fields.join(" ").toLowerCase();
};

const RecipientSelectModal = ({
  isOpen,
  onClose,
  users,
  departmentOrderById,
  positionLevelById,
  initialSelectedIds,
  currentUserId,
  currentUsername,
  onSave,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [expandedGroupKeys, setExpandedGroupKeys] = useState({});

  useEffect(() => {
    if (!isOpen) return;
    setSelectedIds(
      initialSelectedIds.filter((userId) => {
        const targetUser = users.find((u) => String(u.id) === String(userId));
        const isCurrentById =
          currentUserId != null && String(userId) === String(currentUserId);
        const isCurrentByUsername =
          Boolean(currentUsername) && targetUser?.username === currentUsername;
        return !(isCurrentById || isCurrentByUsername);
      }),
    );
    setSearchQuery("");
    setExpandedGroupKeys({});
  }, [isOpen, initialSelectedIds, currentUserId, currentUsername, users]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleEsc = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const selectedIdSet = new Set(selectedIds);
  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredUsers = users.filter((user) => {
    const isCurrentById =
      currentUserId != null && String(user.id) === String(currentUserId);
    const isCurrentByUsername =
      Boolean(currentUsername) && user.username === currentUsername;
    if (isCurrentById || isCurrentByUsername) return false;
    if (selectedIdSet.has(user.id)) return false;
    if (!normalizedQuery) return true;
    return getUserSearchText(user).includes(normalizedQuery);
  });

  const groupedUsers = filteredUsers.reduce((acc, user) => {
    const departmentName = getUserDepartmentName(user) || "부서 미지정";
    const departmentId =
      user?.primary_membership?.department_id ??
      user?.department?.id ??
      user?.department_id ??
      null;
    const rawDepartmentOrder =
      user?.primary_membership?.department_order ??
      user?.department?.order ??
      user?.department_order ??
      (departmentId != null ? departmentOrderById[String(departmentId)] : null);
    const departmentOrder = Number(rawDepartmentOrder);
    const normalizedDepartmentOrder = Number.isFinite(departmentOrder)
      ? departmentOrder
      : Number.MAX_SAFE_INTEGER;
    const groupKey =
      departmentId != null
        ? `department-${departmentId}`
        : `department-name-${departmentName}`;

    if (!acc[groupKey]) {
      acc[groupKey] = {
        groupKey,
        departmentName,
        departmentOrder: normalizedDepartmentOrder,
        users: [],
      };
    }
    acc[groupKey].departmentOrder = Math.min(
      acc[groupKey].departmentOrder,
      normalizedDepartmentOrder,
    );
    acc[groupKey].users.push(user);
    return acc;
  }, {});

  const groupedUserEntries = Object.values(groupedUsers)
    .map((group) => ({
      ...group,
      users: [...group.users].sort((a, b) =>
        compareUsersByPositionThenName(a, b, positionLevelById),
      ),
    }))
    .sort((a, b) => {
      if (a.departmentOrder !== b.departmentOrder) {
        return a.departmentOrder - b.departmentOrder;
      }
      return a.departmentName.localeCompare(b.departmentName, "ko");
    });

  const selectedUsers = selectedIds
    .map((userId) => users.find((user) => user.id === userId))
    .filter(Boolean);

  const addRecipient = (userId) => {
    setSelectedIds((prev) =>
      prev.includes(userId) ? prev : [...prev, userId],
    );
  };

  const removeRecipient = (userId) => {
    setSelectedIds((prev) => prev.filter((id) => id !== userId));
  };

  const addDepartmentUsers = (departmentUsers) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      departmentUsers.forEach((user) => next.add(user.id));
      return Array.from(next);
    });
  };

  const toggleDepartmentGroup = (groupKey) => {
    setExpandedGroupKeys((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 mx-4 w-full max-w-5xl h-[88vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            수신자 선택 관리
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 rounded-lg hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2">
          <div className="p-4 border-b md:border-b-0 md:border-r border-gray-200 overflow-y-auto">
            <div className="mb-3">
              <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <Users size={16} />
                사용자 목록
              </p>
            </div>

            <div className="relative mb-4">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="이름, 아이디, 회사, 부서로 검색"
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
              />
            </div>

            {groupedUserEntries.length === 0 ? (
              <div className="py-12 text-center text-sm text-gray-500 border border-dashed border-gray-200 rounded-xl">
                검색 조건에 맞는 사용자가 없습니다.
              </div>
            ) : (
              <div className="space-y-3">
                {groupedUserEntries.map(
                  ({ groupKey, departmentName, users: departmentUsers }) => {
                    const isExpanded = Boolean(expandedGroupKeys[groupKey]);
                    return (
                      <div
                        key={groupKey}
                        className="border border-gray-200 rounded-xl p-3 bg-gray-50/50"
                      >
                        <div className="flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => toggleDepartmentGroup(groupKey)}
                            className="inline-flex min-w-0 items-center gap-2 text-left"
                          >
                            {isExpanded ? (
                              <ChevronDown
                                size={16}
                                className="text-gray-500 shrink-0"
                              />
                            ) : (
                              <ChevronRight
                                size={16}
                                className="text-gray-500 shrink-0"
                              />
                            )}
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {departmentName}
                            </p>
                            <span className="px-2 py-0.5 text-xs bg-gray-200 text-gray-700 rounded-full">
                              {departmentUsers.length}명
                            </span>
                          </button>
                          <button
                            onClick={() => addDepartmentUsers(departmentUsers)}
                            className="px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-lg hover:bg-green-200"
                          >
                            전체추가
                          </button>
                        </div>

                        {isExpanded && (
                          <div className="mt-2 space-y-1">
                            {departmentUsers.map((user) => {
                              const fullName = getUserDisplayName(user);
                              const position = getUserPositionName(user);

                              return (
                                <button
                                  key={user.id}
                                  onClick={() => addRecipient(user.id)}
                                  className="w-full text-left px-2.5 py-2 rounded-lg bg-white border border-gray-200 hover:border-sky-200 hover:bg-sky-50 transition-colors"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium text-gray-900 truncate">
                                        {fullName}
                                        {position && (
                                          <span className="ml-1 text-gray-500 font-normal">
                                            {position}
                                          </span>
                                        )}
                                      </p>
                                    </div>
                                    <span className="inline-flex items-center gap-1 text-xs text-green-700">
                                      <UserPlus size={14} />
                                      추가
                                    </span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  },
                )}
              </div>
            )}
          </div>

          <div className="p-4 overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-800">
                선택된 수신자 ({selectedUsers.length}명)
              </p>
              {selectedUsers.length > 0 && (
                <button
                  onClick={() => setSelectedIds([])}
                  className="text-xs text-gray-500 hover:text-red-500"
                >
                  전체제거
                </button>
              )}
            </div>

            {selectedUsers.length === 0 ? (
              <div className="h-full min-h-[240px] flex flex-col items-center justify-center text-center text-gray-400">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                  <Users size={28} />
                </div>
                <p className="text-sm">왼쪽 목록에서 수신자를 선택하세요.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedUsers.map((user) => {
                  const fullName = getUserDisplayName(user);
                  const department = getUserDepartmentName(user);
                  const position = getUserPositionName(user);

                  return (
                    <div
                      key={user.id}
                      className="flex items-center justify-between gap-3 p-3 rounded-xl border border-gray-200 bg-white"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {fullName}
                          {position && (
                            <span className="ml-1 text-gray-500 font-normal">
                              {position}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {department}
                        </p>
                      </div>
                      <button
                        onClick={() => removeRecipient(user.id)}
                        className="p-1 text-gray-400 rounded-md hover:bg-red-50 hover:text-red-500"
                        aria-label={`${fullName} 제거`}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            닫기
          </button>
          <button
            onClick={() => onSave(selectedIds)}
            className="px-4 py-2 text-sm text-white bg-sky-500 rounded-lg hover:bg-sky-600"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
};

export default function ContactForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEdit = Boolean(id);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [recipientIds, setRecipientIds] = useState([]);
  const [isToSelf, setIsToSelf] = useState(false);
  const [files, setFiles] = useState([]);
  const [existingAttachments, setExistingAttachments] = useState([]);

  const [users, setUsers] = useState([]);
  const [departmentOrderById, setDepartmentOrderById] = useState({});
  const [positionLevelById, setPositionLevelById] = useState({});
  const [showRecipientModal, setShowRecipientModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadUsers = useCallback(async () => {
    try {
      const res = await api.get("core/users/", {
        params: { page_size: 1000 },
      });
      setUsers(res.data?.results ?? res.data ?? []);
    } catch (err) {
      console.error("Failed to load users:", err);
    }
  }, []);

  const loadDepartments = useCallback(async () => {
    try {
      const res = await api.get("core/departments/", {
        params: { page_size: 1000 },
      });
      const list = res.data?.results ?? res.data ?? [];
      const nextOrderById = {};
      list.forEach((department) => {
        if (department?.id == null) return;
        const parsedOrder = Number(department.order);
        nextOrderById[String(department.id)] = Number.isFinite(parsedOrder)
          ? parsedOrder
          : Number.MAX_SAFE_INTEGER;
      });
      setDepartmentOrderById(nextOrderById);
    } catch (err) {
      console.error("Failed to load departments:", err);
      setDepartmentOrderById({});
    }
  }, []);

  const loadPositions = useCallback(async () => {
    try {
      const res = await api.get("core/positions/", {
        params: { page_size: 1000 },
      });
      const list = res.data?.results ?? res.data ?? [];
      const nextPositionLevelById = {};
      list.forEach((position) => {
        if (position?.id == null) return;
        const parsedLevel = Number(position.level);
        nextPositionLevelById[String(position.id)] = Number.isFinite(
          parsedLevel,
        )
          ? parsedLevel
          : Number.MAX_SAFE_INTEGER;
      });
      setPositionLevelById(nextPositionLevelById);
    } catch (err) {
      console.error("Failed to load positions:", err);
      setPositionLevelById({});
    }
  }, []);

  const loadMessage = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await ContactApi.getMessage(id);
      setTitle(data.title || "");
      setContent(data.content || "");
      setIsToSelf(Boolean(data.is_to_self));
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
    loadDepartments();
    loadPositions();
    loadMessage();
  }, [loadUsers, loadDepartments, loadPositions, loadMessage]);

  useEffect(() => {
    if (!showRecipientModal) return;
    loadDepartments();
    loadPositions();
  }, [showRecipientModal, loadDepartments, loadPositions]);

  useEffect(() => {
    if (!user) return;
    setRecipientIds((prev) =>
      prev.filter((idValue) => {
        const targetUser = users.find((u) => String(u.id) === String(idValue));
        const isCurrentById =
          user.id != null && String(idValue) === String(user.id);
        const isCurrentByUsername =
          Boolean(user.username) && targetUser?.username === user.username;
        return !(isCurrentById || isCurrentByUsername);
      }),
    );
  }, [user, users]);

  const removeRecipient = (userId) => {
    setRecipientIds((prev) => prev.filter((idValue) => idValue !== userId));
  };

  const getRecipientName = (userId) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return `User ${userId}`;
    return getUserDisplayName(user);
  };

  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files || []);
    setFiles((prev) => [...prev, ...newFiles]);
    e.target.value = "";
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (isDraft = false) => {
    if (!title.trim()) {
      alert("제목을 입력해주세요.");
      return;
    }

    if (!content.trim()) {
      alert("내용을 입력해주세요.");
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

      navigate(isDraft ? "/contact/draft" : "/contact/all");
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
            <span className="text-sm text-gray-700">나에게 쓰기</span>
          </label>
        </div>

        {!isToSelf && (
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="text-sm text-gray-600">수신자</div>
              <button
                onClick={() => setShowRecipientModal(true)}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-sky-700 bg-sky-50 rounded-lg hover:bg-sky-100"
              >
                <Search size={15} />
                수신자 검색
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {recipientIds.length === 0 ? (
                <div className="w-full px-3 py-2 text-sm text-gray-400 border border-dashed border-gray-200 rounded-lg">
                  선택된 수신자가 없습니다.
                </div>
              ) : (
                recipientIds.map((uid) => (
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
                ))
              )}
            </div>
          </div>
        )}

        <div className="p-4 border-b border-gray-100">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목을 입력하세요"
            className="w-full text-lg font-medium focus:outline-none"
          />
        </div>

        <div className="p-4">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="내용을 입력하세요"
            rows={12}
            className="w-full resize-none focus:outline-none"
          />
        </div>

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

      <RecipientSelectModal
        isOpen={showRecipientModal}
        onClose={() => setShowRecipientModal(false)}
        users={users}
        departmentOrderById={departmentOrderById}
        positionLevelById={positionLevelById}
        initialSelectedIds={recipientIds}
        currentUserId={user?.id}
        currentUsername={user?.username}
        onSave={(nextRecipientIds) => {
          setRecipientIds(nextRecipientIds);
          setShowRecipientModal(false);
        }}
      />
    </div>
  );
}
