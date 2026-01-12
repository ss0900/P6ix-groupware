// src/pages/approval/ApprovalDetail.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import { 
  ArrowLeft, 
  FileCheck, 
  CheckCircle, 
  XCircle, 
  Clock,
  User,
  Send,
  MessageSquare,
  AlertCircle,
  Printer
} from "lucide-react";

// 상태 뱃지
const StatusBadge = ({ status }) => {
  const config = {
    draft: { bg: "bg-gray-100", text: "text-gray-600", label: "임시저장" },
    pending: { bg: "bg-yellow-100", text: "text-yellow-700", label: "결재중" },
    approved: { bg: "bg-green-100", text: "text-green-700", label: "승인" },
    rejected: { bg: "bg-red-100", text: "text-red-700", label: "반려" },
    canceled: { bg: "bg-gray-100", text: "text-gray-500", label: "취소" },
  };
  const c = config[status] || config.draft;

  return (
    <span className={`px-3 py-1 rounded-full text-sm font-medium ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
};

// 결재선 아이템
const ApprovalLineItem = ({ line, index }) => {
  const statusConfig = {
    waiting: { icon: Clock, color: "text-gray-400", bg: "bg-gray-100" },
    pending: { icon: Clock, color: "text-orange-500", bg: "bg-orange-100" },
    approved: { icon: CheckCircle, color: "text-green-600", bg: "bg-green-100" },
    rejected: { icon: XCircle, color: "text-red-600", bg: "bg-red-100" },
    skipped: { icon: AlertCircle, color: "text-gray-400", bg: "bg-gray-100" },
  };
  const config = statusConfig[line.status] || statusConfig.waiting;
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
      <div className={`w-10 h-10 rounded-full ${config.bg} flex items-center justify-center`}>
        <Icon size={20} className={config.color} />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{line.approver_name}</span>
          <span className="text-sm text-gray-500">{line.approver_position}</span>
          <span className="text-xs px-2 py-0.5 bg-gray-200 rounded">
            {line.approval_type === "approval" ? "결재" : line.approval_type === "agreement" ? "합의" : "참조"}
          </span>
        </div>
        {line.comment && (
          <p className="text-sm text-gray-600 mt-1">"{line.comment}"</p>
        )}
        {line.acted_at && (
          <p className="text-xs text-gray-400 mt-1">
            {new Date(line.acted_at).toLocaleString('ko-KR')}
          </p>
        )}
      </div>
      <span className="text-2xl font-bold text-gray-300">{index + 1}</span>
    </div>
  );
};

export default function ApprovalDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();

  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [comment, setComment] = useState("");
  const [showCommentInput, setShowCommentInput] = useState(false);

  // 문서 로드
  useEffect(() => {
    const loadDocument = async () => {
      setLoading(true);
      try {
        const res = await api.get(`approval/documents/${id}/`);
        setDocument(res.data);
      } catch (err) {
        console.error(err);
        alert("문서를 불러올 수 없습니다.");
        navigate("/approval");
      } finally {
        setLoading(false);
      }
    };
    loadDocument();
  }, [id, navigate]);

  // 현재 사용자가 결재 가능한지 확인
  const canApprove = document?.approval_lines?.some(
    (line) => line.approver === user?.id && line.status === "pending"
  );

  // 문서 작성자인지 확인
  const isAuthor = document?.author === user?.id;

  // 결재 처리
  const handleDecision = async (action) => {
    if (action === "reject" && !comment.trim()) {
      alert("반려 시 의견을 입력해주세요.");
      setShowCommentInput(true);
      return;
    }

    setActionLoading(true);
    try {
      await api.post(`approval/documents/${id}/decide/`, {
        action,
        comment,
      });
      alert(action === "approve" ? "승인되었습니다." : "반려되었습니다.");
      navigate("/approval");
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "처리 중 오류가 발생했습니다.");
    } finally {
      setActionLoading(false);
    }
  };

  // 문서 취소
  const handleCancel = async () => {
    if (!window.confirm("문서를 취소하시겠습니까?")) return;

    setActionLoading(true);
    try {
      await api.post(`approval/documents/${id}/cancel/`);
      alert("문서가 취소되었습니다.");
      navigate("/approval");
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "취소 중 오류가 발생했습니다.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!document) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/approval")}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{document.title}</h1>
              <StatusBadge status={document.status} />
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {document.author_name} • {new Date(document.drafted_at).toLocaleDateString('ko-KR')}
            </p>
          </div>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <Printer size={18} />
          인쇄
        </button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* 왼쪽: 문서 내용 */}
        <div className="col-span-2 space-y-6">
          {/* 문서 정보 */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="grid grid-cols-2 gap-4 mb-6 pb-6 border-b border-gray-100">
              <div>
                <p className="text-sm text-gray-500">양식</p>
                <p className="font-medium">{document.template_name || "일반 문서"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">우선순위</p>
                <p className="font-medium">{document.priority_display}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">기안일</p>
                <p className="font-medium">{new Date(document.drafted_at).toLocaleString('ko-KR')}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">완료일</p>
                <p className="font-medium">
                  {document.completed_at ? new Date(document.completed_at).toLocaleString('ko-KR') : "-"}
                </p>
              </div>
            </div>

            {/* 내용 */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">내용</h3>
              <div className="prose max-w-none">
                {document.content ? (
                  <div className="whitespace-pre-wrap">{document.content}</div>
                ) : (
                  <p className="text-gray-400">내용이 없습니다.</p>
                )}
              </div>
            </div>
          </div>

          {/* 결재 의견 입력 (결재 가능한 경우) */}
          {canApprove && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <MessageSquare size={18} />
                결재 의견
              </h3>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="결재 의견을 입력하세요 (반려 시 필수)"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              />
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => handleDecision("reject")}
                  disabled={actionLoading}
                  className="flex items-center gap-2 px-6 py-2.5 border border-red-500 text-red-500 rounded-lg hover:bg-red-50 font-medium disabled:opacity-50"
                >
                  <XCircle size={18} />
                  반려
                </button>
                <button
                  onClick={() => handleDecision("approve")}
                  disabled={actionLoading}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50"
                >
                  <CheckCircle size={18} />
                  {actionLoading ? "처리 중..." : "승인"}
                </button>
              </div>
            </div>
          )}

          {/* 문서 취소 (작성자이고 pending 상태인 경우) */}
          {isAuthor && document.status === "pending" && (
            <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle size={20} className="text-yellow-600" />
                <span className="text-yellow-800">결재 진행 중인 문서입니다.</span>
              </div>
              <button
                onClick={handleCancel}
                disabled={actionLoading}
                className="px-4 py-2 text-sm font-medium text-yellow-700 hover:bg-yellow-100 rounded-lg"
              >
                문서 취소 (회수)
              </button>
            </div>
          )}
        </div>

        {/* 오른쪽: 결재선 */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <User size={18} />
              결재선
            </h3>
            <div className="space-y-3">
              {document.approval_lines?.map((line, index) => (
                <ApprovalLineItem key={line.id} line={line} index={index} />
              ))}
            </div>
          </div>

          {/* 결재 이력 */}
          {document.actions?.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <FileCheck size={18} />
                결재 이력
              </h3>
              <div className="space-y-3">
                {document.actions.map((action) => (
                  <div key={action.id} className="text-sm border-l-2 border-gray-200 pl-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{action.actor_name}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        action.action === "approve" ? "bg-green-100 text-green-700" :
                        action.action === "reject" ? "bg-red-100 text-red-700" :
                        "bg-gray-100 text-gray-600"
                      }`}>
                        {action.action === "submit" ? "제출" :
                         action.action === "approve" ? "승인" :
                         action.action === "reject" ? "반려" :
                         action.action === "cancel" ? "취소" : action.action}
                      </span>
                    </div>
                    {action.comment && (
                      <p className="text-gray-600 mt-1">"{action.comment}"</p>
                    )}
                    <p className="text-gray-400 text-xs mt-1">
                      {new Date(action.created_at).toLocaleString('ko-KR')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
