// src/pages/operation/LeadDetail.jsx
/**
 * 영업기회 상세 페이지
 */
import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  FiArrowLeft,
  FiEdit2,
  FiTrash2,
  FiPhone,
  FiMail,
  FiCalendar,
  FiMessageSquare,
  FiPaperclip,
  FiCheckSquare,
  FiFileText,
  FiPlus,
  FiClock,
  FiUser,
  FiDollarSign,
} from "react-icons/fi";
import { SalesService, QuoteService } from "../../api/operation";
import { fetchUsers } from "../../api/users/user";
import Modal from "../../components/common/ui/Modal";

function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("activities");
  const [stages, setStages] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [users, setUsers] = useState([]);

  // 접수 처리 모달
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [acceptForm, setAcceptForm] = useState({
    stage_id: "",
    note: "",
    create_task: true,
    task_title: "다음 액션",
    task_due_date: "",
    task_priority: "medium",
  });

  // 모달 상태
  const [activityModal, setActivityModal] = useState(false);
  const [taskModal, setTaskModal] = useState(false);
  const [newActivity, setNewActivity] = useState({
    activity_type: "note",
    title: "",
    content: "",
  });
  const [newTask, setNewTask] = useState({
    title: "",
    due_date: "",
    priority: "medium",
    assignee: "",
  });

  const loadUsers = useCallback(async () => {
    try {
      const res = await fetchUsers();
      const list = res.data?.results ?? res.data ?? [];
      setUsers(list);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  }, []);

  const fetchLead = useCallback(async () => {
    setLoading(true);
    try {
      const data = await SalesService.getLead(id);
      setLead(data);
      if (data?.owner) {
        setNewTask((prev) =>
          prev.assignee ? prev : { ...prev, assignee: data.owner }
        );
      }

      // 파이프라인의 단계 로드
      if (data.pipeline) {
        const stagesData = await SalesService.getStages(data.pipeline);
        setStages(stagesData);
      }
    } catch (error) {
      console.error("Error fetching lead:", error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchQuotes = useCallback(async () => {
    try {
      const data = await QuoteService.getQuotes({ lead: id });
      setQuotes(data.results || data);
    } catch (error) {
      console.error("Error fetching quotes:", error);
    }
  }, [id]);

  useEffect(() => {
    fetchLead();
  }, [fetchLead]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    fetchQuotes();
  }, [fetchQuotes]);

  const isInboxLike = () => {
    // owner가 없거나, stage가 첫 단계인 경우(상세 serializer에 stage_data가 있으면 더 정확히 가능)
    if (!lead) return false;
    if (!lead.owner) return true;
    // stage_data.order가 없을 수 있어 보수적으로 처리
    return false;
  };

  const submitAccept = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...acceptForm,
        stage_id: acceptForm.stage_id || null,
      };
      await SalesService.acceptInbox(id, payload);
      setAcceptOpen(false);
      setAcceptForm((p) => ({ ...p, stage_id: "", note: "" }));
      fetchLead();
    } catch (err) {
      console.error(err);
      alert("접수 처리 중 오류가 발생했습니다.");
    }
  };

  const handleStageChange = async (stageId) => {
    try {
      await SalesService.moveStage(id, stageId);
      fetchLead();
    } catch (error) {
      console.error("Error moving stage:", error);
    }
  };

  const handleAddActivity = async (e) => {
    e.preventDefault();
    try {
      await SalesService.createActivity(id, newActivity);
      setActivityModal(false);
      setNewActivity({ activity_type: "note", title: "", content: "" });
      fetchLead();
    } catch (error) {
      console.error("Error creating activity:", error);
    }
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...newTask,
        due_date: newTask.due_date || null,
        assignee: newTask.assignee ? Number(newTask.assignee) : null,
      };
      await SalesService.createTask(id, payload);
      setTaskModal(false);
      setNewTask({ title: "", due_date: "", priority: "medium", assignee: "" });
      fetchLead();
    } catch (error) {
      console.error("Error creating task:", error);
    }
  };

  const openTaskModal = () => {
    if (lead?.owner) {
      setNewTask((prev) =>
        prev.assignee ? prev : { ...prev, assignee: lead.owner }
      );
    }
    setTaskModal(true);
  };

  const handleCompleteTask = async (taskId) => {
    try {
      await SalesService.completeTask(taskId);
      fetchLead();
    } catch (error) {
      console.error("Error completing task:", error);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      await SalesService.uploadFile(id, file);
      fetchLead();
    } catch (error) {
      console.error("Error uploading file:", error);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("정말 삭제하시겠습니까?")) return;
    try {
      await SalesService.deleteLead(id);
      navigate("/operation/sales/leads");
    } catch (error) {
      console.error("Error deleting lead:", error);
    }
  };

  const formatAmount = (amount) => {
    if (!amount) return "-";
    return new Intl.NumberFormat("ko-KR").format(amount) + "원";
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("ko-KR");
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleString("ko-KR");
  };

  const getUserLabel = (user) => {
    const name = `${user.last_name ?? ""}${user.first_name ?? ""}`.trim();
    return name || user.username || user.email || `사용자 ${user.id}`;
  };

  const activityTypeIcon = {
    note: FiMessageSquare,
    call: FiPhone,
    email: FiMail,
    meeting: FiCalendar,
    stage_change: FiArrowLeft,
    quote_sent: FiFileText,
    file_added: FiPaperclip,
    task_done: FiCheckSquare,
    won: FiDollarSign,
    lost: FiTrash2,
    created: FiPlus,
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="text-center py-12 text-gray-500">
        영업기회를 찾을 수 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/operation/sales/leads")}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <FiArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-title">{lead.title}</h1>
            <p className="text-muted">
              {lead.company_data?.name || "고객사 미지정"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isInboxLike() && (
            <button
              onClick={() => setAcceptOpen(true)}
              className="btn-primary"
            >
              접수 처리
            </button>
          )}
          <button
            onClick={() => navigate(`/operation/sales/leads/${id}/edit`)}
            className="btn-edit flex items-center gap-2"
          >
            <FiEdit2 className="w-4 h-4" />
            수정
          </button>
          <button
            onClick={handleDelete}
            className="btn-delete flex items-center gap-2"
          >
            <FiTrash2 className="w-4 h-4" />
            삭제
          </button>
        </div>
      </div>

      {/* Stage Progress */}
      <div className="page-box">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">영업 단계</h3>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {stages.map((stage) => (
            <button
              key={stage.id}
              onClick={() => handleStageChange(stage.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                lead.stage === stage.id
                  ? "text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
              style={
                lead.stage === stage.id ? { backgroundColor: stage.color } : {}
              }
            >
              {stage.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Accept Modal */}
        <Modal
          isOpen={acceptOpen}
          onClose={() => setAcceptOpen(false)}
          title="접수 처리"
          size="md"
        >
          <form onSubmit={submitAccept} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                이동할 단계 (선택)
              </label>
              <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                value={acceptForm.stage_id}
                onChange={(e) =>
                  setAcceptForm((p) => ({ ...p, stage_id: e.target.value }))
                }
              >
                <option value="">(미선택 시 다음 단계 자동)</option>
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                메모 (선택)
              </label>
              <textarea
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                rows={3}
                value={acceptForm.note}
                onChange={(e) =>
                  setAcceptForm((p) => ({ ...p, note: e.target.value }))
                }
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={acceptForm.create_task}
                onChange={(e) =>
                  setAcceptForm((p) => ({ ...p, create_task: e.target.checked }))
                }
              />
              <span className="text-sm text-gray-700">다음 액션 TODO 생성</span>
            </div>

            {acceptForm.create_task && (
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    TODO 제목
                  </label>
                  <input
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                    value={acceptForm.task_title}
                    onChange={(e) =>
                      setAcceptForm((p) => ({ ...p, task_title: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    기한
                  </label>
                  <input
                    type="datetime-local"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                    value={acceptForm.task_due_date}
                    onChange={(e) =>
                      setAcceptForm((p) => ({ ...p, task_due_date: e.target.value }))
                    }
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAcceptOpen(false)}
                className="btn-secondary"
              >
                취소
              </button>
              <button type="submit" className="btn-primary">
                접수 완료
              </button>
            </div>
          </form>
        </Modal>
        {/* 좌측: 기본 정보 */}
        <div className="lg:col-span-1 space-y-6">
          {/* 기본 정보 카드 */}
          <div className="page-box">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">
              기본 정보
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <FiDollarSign className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">예상 금액</p>
                  <p className="text-sm font-medium">
                    {formatAmount(lead.expected_amount)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <FiCalendar className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">예상 마감일</p>
                  <p className="text-sm font-medium">
                    {formatDate(lead.expected_close_date)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <FiCalendar className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">다음 액션 예정일</p>
                  <p className="text-sm font-medium">
                    {formatDateTime(lead.next_action_due_at)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <FiUser className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">담당자</p>
                  <p className="text-sm font-medium">
                    {lead.owner_data?.full_name || "-"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <FiClock className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">확률</p>
                  <p className="text-sm font-medium">{lead.probability}%</p>
                </div>
              </div>
            </div>
          </div>

          {/* 고객 정보 카드 */}
          {lead.company_data && (
            <div className="page-box">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">
                고객 정보
              </h3>
              <div className="space-y-2">
                <p className="text-sm font-medium">{lead.company_data.name}</p>
                {lead.contact_data && (
                  <div className="text-sm text-gray-600">
                    <p>
                      {lead.contact_data.name} {lead.contact_data.position}
                    </p>
                    {lead.contact_data.phone && (
                      <p>{lead.contact_data.phone}</p>
                    )}
                    {lead.contact_data.email && (
                      <p>{lead.contact_data.email}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 설명 */}
          {lead.description && (
            <div className="page-box">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">설명</h3>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">
                {lead.description}
              </p>
            </div>
          )}
        </div>

        {/* 우측: 탭 콘텐츠 */}
        <div className="lg:col-span-2">
          <div className="page-box">
            {/* 탭 */}
            <div className="flex border-b border-gray-200 mb-4">
              {[
                { key: "activities", label: "활동", icon: FiMessageSquare },
                {
                  key: "tasks",
                  label: "할 일",
                  icon: FiCheckSquare,
                  count: lead.tasks?.filter((t) => !t.is_completed).length,
                },
                {
                  key: "files",
                  label: "파일",
                  icon: FiPaperclip,
                  count: lead.files?.length,
                },
                {
                  key: "quotes",
                  label: "견적",
                  icon: FiFileText,
                  count: quotes.length,
                },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.key
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                  {tab.count > 0 && (
                    <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full text-xs">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* 활동 탭 */}
            {activeTab === "activities" && (
              <div>
                <div className="flex justify-end mb-4">
                  <button
                    onClick={() => setActivityModal(true)}
                    className="btn-create-sm flex items-center gap-1"
                  >
                    <FiPlus className="w-3 h-3" />
                    활동 추가
                  </button>
                </div>
                <div className="space-y-4">
                  {lead.activities?.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">
                      활동 기록이 없습니다.
                    </p>
                  ) : (
                    lead.activities?.map((activity) => {
                      const Icon =
                        activityTypeIcon[activity.activity_type] ||
                        FiMessageSquare;
                      return (
                        <div
                          key={activity.id}
                          className="flex gap-3 pb-4 border-b border-gray-100"
                        >
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                            <Icon className="w-4 h-4 text-gray-500" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              {activity.title}
                            </p>
                            {activity.content && (
                              <p className="text-sm text-gray-600 mt-1">
                                {activity.content}
                              </p>
                            )}
                            <p className="text-xs text-gray-400 mt-1">
                              {activity.created_by_name} ·{" "}
                              {formatDateTime(activity.created_at)}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* 할 일 탭 */}
            {activeTab === "tasks" && (
              <div>
                <div className="flex justify-end mb-4">
                  <button
                    onClick={openTaskModal}
                    className="btn-create-sm flex items-center gap-1"
                  >
                    <FiPlus className="w-3 h-3" />할 일 추가
                  </button>
                </div>
                <div className="space-y-2">
                  {lead.tasks?.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">
                      할 일이 없습니다.
                    </p>
                  ) : (
                    lead.tasks?.map((task) => (
                      <div
                        key={task.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border ${
                          task.is_completed
                            ? "bg-gray-50 border-gray-200"
                            : "bg-white border-gray-200"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={task.is_completed}
                          onChange={() =>
                            !task.is_completed && handleCompleteTask(task.id)
                          }
                          className="w-4 h-4 rounded border-gray-300"
                        />
                        <div className="flex-1">
                          <p
                            className={`text-sm ${
                              task.is_completed
                                ? "line-through text-gray-400"
                                : "text-gray-900"
                            }`}
                          >
                            {task.title}
                          </p>
                          {task.due_date && (
                            <p
                              className={`text-xs ${
                                task.is_overdue
                                  ? "text-red-500"
                                  : "text-gray-400"
                              }`}
                            >
                              {formatDate(task.due_date)}
                            </p>
                          )}
                        </div>
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            task.priority === "high"
                              ? "bg-red-100 text-red-700"
                              : task.priority === "medium"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {task.priority_display}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* 파일 탭 */}
            {activeTab === "files" && (
              <div>
                <div className="flex justify-end mb-4">
                  <label className="btn-upload-sm flex items-center gap-1 cursor-pointer">
                    <FiPlus className="w-3 h-3" />
                    파일 추가
                    <input
                      type="file"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                <div className="space-y-2">
                  {lead.files?.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">
                      첨부 파일이 없습니다.
                    </p>
                  ) : (
                    lead.files?.map((file) => (
                      <a
                        key={file.id}
                        href={file.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                      >
                        <FiPaperclip className="w-4 h-4 text-gray-400" />
                        <div className="flex-1">
                          <p className="text-sm text-gray-900">{file.name}</p>
                          <p className="text-xs text-gray-400">
                            {(file.size / 1024).toFixed(1)} KB ·{" "}
                            {formatDateTime(file.created_at)}
                          </p>
                        </div>
                      </a>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* 견적 탭 */}
            {activeTab === "quotes" && (
              <div>
                <div className="flex justify-end mb-4">
                  <button
                    onClick={() =>
                      navigate(`/operation/sales/quotes/new?lead=${lead.id}`)
                    }
                    className="btn-create-sm flex items-center gap-1"
                  >
                    <FiPlus className="w-3 h-3" />
                    견적 작성
                  </button>
                </div>
                <div className="space-y-2">
                  {quotes.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">
                      견적이 없습니다.
                    </p>
                  ) : (
                    quotes.map((quote) => (
                      <div
                        key={quote.id}
                        onClick={() =>
                          navigate(`/operation/sales/quotes/${quote.id}`)
                        }
                        className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {quote.title}
                            </p>
                            <p className="text-xs text-gray-500">
                              {quote.quote_number}
                            </p>
                          </div>
                          <span className="text-sm font-medium text-gray-700">
                            {formatAmount(quote.total_amount)}
                          </span>
                        </div>
                        <div className="mt-2 text-xs text-gray-500">
                          {formatDate(quote.created_at)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 활동 추가 모달 */}
      <Modal
        isOpen={activityModal}
        onClose={() => setActivityModal(false)}
        title="활동 추가"
      >
        <form onSubmit={handleAddActivity} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              유형
            </label>
            <select
              value={newActivity.activity_type}
              onChange={(e) =>
                setNewActivity({
                  ...newActivity,
                  activity_type: e.target.value,
                })
              }
              className="input-base"
            >
              <option value="note">메모</option>
              <option value="call">전화</option>
              <option value="email">이메일</option>
              <option value="meeting">미팅</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              제목
            </label>
            <input
              type="text"
              value={newActivity.title}
              onChange={(e) =>
                setNewActivity({ ...newActivity, title: e.target.value })
              }
              className="input-base"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              내용
            </label>
            <textarea
              value={newActivity.content}
              onChange={(e) =>
                setNewActivity({ ...newActivity, content: e.target.value })
              }
              className="input-base"
              rows={4}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setActivityModal(false)}
              className="btn-cancel"
            >
              취소
            </button>
            <button type="submit" className="btn-save">
              저장
            </button>
          </div>
        </form>
      </Modal>

      {/* 할 일 추가 모달 */}
      <Modal
        isOpen={taskModal}
        onClose={() => setTaskModal(false)}
        title="할 일 추가"
      >
        <form onSubmit={handleAddTask} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              제목
            </label>
            <input
              type="text"
              value={newTask.title}
              onChange={(e) =>
                setNewTask({ ...newTask, title: e.target.value })
              }
              className="input-base"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              기한
            </label>
            <input
              type="datetime-local"
              value={newTask.due_date}
              onChange={(e) =>
                setNewTask({ ...newTask, due_date: e.target.value })
              }
              className="input-base"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              담당자
            </label>
            <select
              value={newTask.assignee}
              onChange={(e) =>
                setNewTask({ ...newTask, assignee: e.target.value })
              }
              className="input-base"
            >
              <option value="">(미지정)</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {getUserLabel(user)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              우선순위
            </label>
            <select
              value={newTask.priority}
              onChange={(e) =>
                setNewTask({ ...newTask, priority: e.target.value })
              }
              className="input-base"
            >
              <option value="low">낮음</option>
              <option value="medium">보통</option>
              <option value="high">높음</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setTaskModal(false)}
              className="btn-cancel"
            >
              취소
            </button>
            <button type="submit" className="btn-save">
              저장
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default LeadDetail;
