// src/pages/sales/OpportunityDetail.jsx
// 영업 기회 상세 페이지
import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { opportunityApi, stageApi } from "../../api/salesApi";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Building2,
  User,
  Calendar,
  DollarSign,
  Target,
  AlertCircle,
  Phone,
  Mail,
  MessageSquare,
  FileText,
  CheckSquare,
  Clock,
  Plus,
  Check,
  Upload,
  Download,
} from "lucide-react";

// 금액 포맷
const formatCurrency = (value) => {
  if (!value) return "₩0";
  return `₩${Number(value).toLocaleString()}`;
};

// 날짜 포맷
const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("ko-KR");
};

// 시간 포맷
const formatDateTime = (dateStr) => {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleString("ko-KR");
};

// 상태 뱃지
const StatusBadge = ({ status, display }) => {
  const config = {
    lead: { bg: "bg-gray-100", text: "text-gray-600" },
    contact: { bg: "bg-blue-100", text: "text-blue-600" },
    proposal: { bg: "bg-yellow-100", text: "text-yellow-600" },
    negotiation: { bg: "bg-purple-100", text: "text-purple-600" },
    won: { bg: "bg-green-100", text: "text-green-600" },
    lost: { bg: "bg-red-100", text: "text-red-600" },
  };
  const c = config[status] || config.lead;
  return (
    <span className={`px-3 py-1 rounded-full text-sm font-medium ${c.bg} ${c.text}`}>
      {display}
    </span>
  );
};

// 활동 아이콘
const ActivityIcon = ({ type }) => {
  const icons = {
    call: <Phone size={16} className="text-green-500" />,
    meeting: <User size={16} className="text-blue-500" />,
    email: <Mail size={16} className="text-orange-500" />,
    note: <MessageSquare size={16} className="text-gray-500" />,
    stage_change: <Target size={16} className="text-purple-500" />,
    file_add: <FileText size={16} className="text-indigo-500" />,
    quote_sent: <DollarSign size={16} className="text-green-600" />,
    task_done: <CheckSquare size={16} className="text-green-500" />,
    created: <Plus size={16} className="text-blue-500" />,
  };
  return icons[type] || <MessageSquare size={16} className="text-gray-500" />;
};

// 탭 컴포넌트
const TabButton = ({ active, onClick, children, count }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
      active
        ? "border-blue-500 text-blue-600"
        : "border-transparent text-gray-500 hover:text-gray-700"
    }`}
  >
    {children}
    {count !== undefined && (
      <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-gray-100 rounded-full">
        {count}
      </span>
    )}
  </button>
);

export default function OpportunityDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [opportunity, setOpportunity] = useState(null);
  const [stages, setStages] = useState([]);
  const [activities, setActivities] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("activities");
  
  // 활동 추가 폼
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [activityForm, setActivityForm] = useState({
    activity_type: "note",
    title: "",
    content: "",
  });
  
  // 태스크 추가 폼
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    due_date: "",
  });

  // 데이터 로드
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [oppRes, activitiesRes, tasksRes, filesRes] = await Promise.all([
        opportunityApi.getDetail(id),
        opportunityApi.getActivities(id),
        opportunityApi.getTasks(id),
        opportunityApi.getFiles(id),
      ]);
      
      setOpportunity(oppRes.data);
      setActivities(activitiesRes.data || []);
      setTasks(tasksRes.data || []);
      setFiles(filesRes.data || []);
      
      // 해당 파이프라인의 단계 로드
      if (oppRes.data.pipeline) {
        const stagesRes = await stageApi.getList({ pipeline: oppRes.data.pipeline });
        setStages(stagesRes.data?.results ?? stagesRes.data ?? []);
      }
    } catch (err) {
      console.error("데이터 로드 실패:", err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 단계 변경
  const handleStageChange = async (stageId) => {
    try {
      await opportunityApi.moveStage(id, stageId);
      loadData();
    } catch (err) {
      console.error("단계 변경 실패:", err);
      alert("단계 변경에 실패했습니다.");
    }
  };

  // 활동 추가
  const handleAddActivity = async (e) => {
    e.preventDefault();
    try {
      await opportunityApi.addActivity(id, activityForm);
      setShowActivityForm(false);
      setActivityForm({ activity_type: "note", title: "", content: "" });
      loadData();
    } catch (err) {
      console.error("활동 추가 실패:", err);
      alert("활동 추가에 실패했습니다.");
    }
  };

  // 태스크 추가
  const handleAddTask = async (e) => {
    e.preventDefault();
    try {
      await opportunityApi.addTask(id, taskForm);
      setShowTaskForm(false);
      setTaskForm({ title: "", description: "", due_date: "" });
      loadData();
    } catch (err) {
      console.error("태스크 추가 실패:", err);
      alert("태스크 추가에 실패했습니다.");
    }
  };

  // 태스크 완료
  const handleCompleteTask = async (taskId) => {
    try {
      await opportunityApi.completeTask(id, taskId);
      loadData();
    } catch (err) {
      console.error("태스크 완료 실패:", err);
      alert("태스크 완료에 실패했습니다.");
    }
  };

  // 파일 업로드
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      await opportunityApi.uploadFile(id, file);
      loadData();
    } catch (err) {
      console.error("파일 업로드 실패:", err);
      alert("파일 업로드에 실패했습니다.");
    }
  };

  // 삭제
  const handleDelete = async () => {
    if (!window.confirm("정말 삭제하시겠습니까?")) return;
    try {
      await opportunityApi.delete(id);
      navigate("/sales/opportunities");
    } catch (err) {
      console.error("삭제 실패:", err);
      alert("삭제에 실패했습니다.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (!opportunity) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <AlertCircle size={48} className="mb-4" />
        <p>영업 기회를 찾을 수 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{opportunity.title}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {opportunity.client_name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/sales/opportunities/${id}/edit`)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Edit size={18} />
            수정
          </button>
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
          >
            <Trash2 size={18} />
            삭제
          </button>
        </div>
      </div>

      {/* 상태/단계 변경 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <StatusBadge status={opportunity.status} display={opportunity.status_display} />
            {opportunity.is_stagnant && (
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-600 flex items-center gap-1">
                <AlertCircle size={14} />
                정체 ({opportunity.stalled_days}일)
              </span>
            )}
          </div>
          
          {/* 단계 선택 */}
          {stages.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">단계:</span>
              <div className="flex gap-1">
                {stages.map((stage) => (
                  <button
                    key={stage.id}
                    onClick={() => handleStageChange(stage.id)}
                    className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                      opportunity.stage === stage.id
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {stage.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 주요 정보 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 기본 정보 */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-800 mb-4">기본 정보</h3>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">예상 금액</dt>
                <dd className="font-semibold text-blue-600">
                  {formatCurrency(opportunity.expected_amount)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">성공 확률</dt>
                <dd>{opportunity.probability}%</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">가중 금액</dt>
                <dd>{formatCurrency(opportunity.weighted_amount)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">예상 마감일</dt>
                <dd>{formatDate(opportunity.expected_close_date)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">유입 경로</dt>
                <dd>{opportunity.source_display || "-"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">담당자</dt>
                <dd>{opportunity.owner_name || "-"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">등록일</dt>
                <dd>{formatDate(opportunity.created_at)}</dd>
              </div>
            </dl>
          </div>

          {/* 다음 단계 */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-800 mb-4">다음 단계</h3>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {opportunity.next_step || "- 설정되지 않음 -"}
            </p>
            {opportunity.next_step_date && (
              <p className="text-sm text-gray-500 mt-2 flex items-center gap-1">
                <Calendar size={14} />
                {formatDate(opportunity.next_step_date)}
              </p>
            )}
          </div>

          {/* 설명 */}
          {opportunity.description && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-800 mb-4">설명</h3>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {opportunity.description}
              </p>
            </div>
          )}
        </div>

        {/* 탭 영역 */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200">
            {/* 탭 헤더 */}
            <div className="flex border-b border-gray-200 px-4">
              <TabButton
                active={activeTab === "activities"}
                onClick={() => setActiveTab("activities")}
                count={activities.length}
              >
                활동
              </TabButton>
              <TabButton
                active={activeTab === "tasks"}
                onClick={() => setActiveTab("tasks")}
                count={tasks.filter((t) => !t.is_completed).length}
              >
                태스크
              </TabButton>
              <TabButton
                active={activeTab === "files"}
                onClick={() => setActiveTab("files")}
                count={files.length}
              >
                파일
              </TabButton>
            </div>

            {/* 탭 내용 */}
            <div className="p-4">
              {/* 활동 탭 */}
              {activeTab === "activities" && (
                <div className="space-y-4">
                  <button
                    onClick={() => setShowActivityForm(!showActivityForm)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
                  >
                    <Plus size={18} />
                    활동 추가
                  </button>

                  {showActivityForm && (
                    <form onSubmit={handleAddActivity} className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <select
                          value={activityForm.activity_type}
                          onChange={(e) => setActivityForm({ ...activityForm, activity_type: e.target.value })}
                          className="px-3 py-2 border border-gray-300 rounded-lg"
                        >
                          <option value="call">전화</option>
                          <option value="meeting">미팅</option>
                          <option value="email">이메일</option>
                          <option value="note">메모</option>
                          <option value="other">기타</option>
                        </select>
                        <input
                          type="text"
                          placeholder="제목"
                          value={activityForm.title}
                          onChange={(e) => setActivityForm({ ...activityForm, title: e.target.value })}
                          className="px-3 py-2 border border-gray-300 rounded-lg"
                          required
                        />
                      </div>
                      <textarea
                        placeholder="내용"
                        value={activityForm.content}
                        onChange={(e) => setActivityForm({ ...activityForm, content: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none"
                        rows={3}
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setShowActivityForm(false)}
                          className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                        >
                          취소
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          추가
                        </button>
                      </div>
                    </form>
                  )}

                  {/* 활동 타임라인 */}
                  <div className="space-y-4">
                    {activities.length === 0 ? (
                      <p className="text-center py-8 text-gray-400">활동 내역이 없습니다.</p>
                    ) : (
                      activities.map((activity) => (
                        <div key={activity.id} className="flex gap-3">
                          <div className="flex-shrink-0 mt-1">
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                              <ActivityIcon type={activity.activity_type} />
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">
                                {activity.title}
                              </span>
                              {activity.is_system && (
                                <span className="text-xs text-gray-400">시스템</span>
                              )}
                            </div>
                            {activity.content && (
                              <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">
                                {activity.content}
                              </p>
                            )}
                            <p className="text-xs text-gray-400 mt-1">
                              {activity.created_by_name} · {formatDateTime(activity.created_at)}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* 태스크 탭 */}
              {activeTab === "tasks" && (
                <div className="space-y-4">
                  <button
                    onClick={() => setShowTaskForm(!showTaskForm)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
                  >
                    <Plus size={18} />
                    태스크 추가
                  </button>

                  {showTaskForm && (
                    <form onSubmit={handleAddTask} className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <input
                        type="text"
                        placeholder="태스크 제목"
                        value={taskForm.title}
                        onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        required
                      />
                      <input
                        type="date"
                        value={taskForm.due_date}
                        onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                      <textarea
                        placeholder="설명"
                        value={taskForm.description}
                        onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none"
                        rows={2}
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setShowTaskForm(false)}
                          className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                        >
                          취소
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          추가
                        </button>
                      </div>
                    </form>
                  )}

                  {/* 태스크 목록 */}
                  <div className="space-y-2">
                    {tasks.length === 0 ? (
                      <p className="text-center py-8 text-gray-400">태스크가 없습니다.</p>
                    ) : (
                      tasks.map((task) => (
                        <div
                          key={task.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border ${
                            task.is_completed
                              ? "bg-gray-50 border-gray-200"
                              : task.is_overdue
                              ? "bg-red-50 border-red-200"
                              : "bg-white border-gray-200"
                          }`}
                        >
                          <button
                            onClick={() => !task.is_completed && handleCompleteTask(task.id)}
                            className={`w-5 h-5 rounded border flex items-center justify-center ${
                              task.is_completed
                                ? "bg-green-500 border-green-500 text-white"
                                : "border-gray-300 hover:border-blue-500"
                            }`}
                            disabled={task.is_completed}
                          >
                            {task.is_completed && <Check size={12} />}
                          </button>
                          <div className="flex-1">
                            <p className={`font-medium ${task.is_completed ? "line-through text-gray-400" : "text-gray-900"}`}>
                              {task.title}
                            </p>
                            {task.due_date && (
                              <p className={`text-xs ${task.is_overdue ? "text-red-500" : "text-gray-500"}`}>
                                <Clock size={10} className="inline mr-1" />
                                {formatDate(task.due_date)}
                              </p>
                            )}
                          </div>
                          {task.assignee_name && (
                            <span className="text-xs text-gray-500">{task.assignee_name}</span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* 파일 탭 */}
              {activeTab === "files" && (
                <div className="space-y-4">
                  <label className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 cursor-pointer w-fit">
                    <Upload size={18} />
                    파일 업로드
                    <input
                      type="file"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>

                  {/* 파일 목록 */}
                  <div className="space-y-2">
                    {files.length === 0 ? (
                      <p className="text-center py-8 text-gray-400">첨부 파일이 없습니다.</p>
                    ) : (
                      files.map((file) => (
                        <div
                          key={file.id}
                          className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200"
                        >
                          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                            <FileText size={18} className="text-gray-500" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{file.filename}</p>
                            <p className="text-xs text-gray-500">
                              {(file.file_size / 1024).toFixed(1)} KB · {file.uploaded_by_name} · {formatDate(file.uploaded_at)}
                            </p>
                          </div>
                          <a
                            href={file.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 hover:bg-gray-100 rounded-lg"
                          >
                            <Download size={18} className="text-gray-500" />
                          </a>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
