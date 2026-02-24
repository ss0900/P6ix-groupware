// src/pages/approval/ApprovalDetail.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import {
  ArrowLeft,
  FileEdit,
  CheckCircle,
  XCircle,
  Clock,
  User,
  MessageSquare,
  Printer,
  Download,
  Paperclip,
  Trash2,
} from "lucide-react";
import ApprovalStamp from "./components/ApprovalStamp";
import ApprovalTimeline from "./components/ApprovalTimeline";

// 상태 뱃지
const StatusBadge = ({ status }) => {
  const styles = {
    draft: "bg-gray-100 text-gray-600 border-gray-300",
    pending: "bg-blue-100 text-blue-600 border-blue-300",
    approved: "bg-green-100 text-green-600 border-green-300",
    rejected: "bg-red-100 text-red-600 border-red-300",
    canceled: "bg-gray-100 text-gray-500 border-gray-300",
  };

  const labels = {
    draft: "임시저장",
    pending: "결재 중",
    approved: "승인 완료",
    rejected: "반려",
    canceled: "취소",
  };

  return (
    <span className={`px-3 py-1 text-sm rounded-full border ${styles[status] || styles.draft}`}>
      {labels[status] || status}
    </span>
  );
};

export default function ApprovalDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();

  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [decisionComment, setDecisionComment] = useState("");
  const [processing, setProcessing] = useState(false);

  // 문서 로드
  const loadDocument = async () => {
    try {
      const res = await api.get(`/approval/documents/${id}/`);
      setDocument(res.data);
    } catch (err) {
      console.error("Failed to load document:", err);
      alert("문서를 불러오는데 실패했습니다.");
      navigate("/approval");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocument();
  }, [id]);

  // 현재 사용자가 결재 차례인지 확인
  const isMyTurn = () => {
    if (!document || !user) return false;
    return document.approval_lines?.some(
      (line) => line.approver === user.id && line.status === "pending"
    );
  };

  // 문서 작성자인지 확인
  const isAuthor = () => {
    if (!document || !user) return false;
    return document.author === user.id;
  };

  // 결재 처리
  const handleDecision = async (action) => {
    if (!window.confirm(action === "approve" ? "승인하시겠습니까?" : "반려하시겠습니까?")) {
      return;
    }

    setProcessing(true);
    try {
      await api.post(`/approval/documents/${id}/decide/`, {
        action,
        comment: decisionComment,
      });
      alert(action === "approve" ? "승인되었습니다." : "반려되었습니다.");
      loadDocument();
      setDecisionComment("");
    } catch (err) {
      console.error("Decision failed:", err);
      alert("처리 중 오류가 발생했습니다.");
    } finally {
      setProcessing(false);
    }
  };

  // 문서 취소
  const handleCancel = async () => {
    if (!window.confirm("문서를 취소(회수)하시겠습니까?")) {
      return;
    }

    setProcessing(true);
    try {
      await api.post(`/approval/documents/${id}/cancel/`, {
        comment: decisionComment,
      });
      alert("문서가 취소되었습니다.");
      navigate("/approval");
    } catch (err) {
      console.error("Cancel failed:", err);
      alert("취소 중 오류가 발생했습니다.");
    } finally {
      setProcessing(false);
    }
  };

  // 첨부파일 다운로드
  const handleDownload = async (attachment) => {
    try {
      const res = await api.get(`/approval/attachments/${attachment.id}/download/`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", attachment.filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Download failed:", err);
      alert("다운로드에 실패했습니다.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-sky-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="text-center py-20 text-gray-500">
        문서를 찾을 수 없습니다.
      </div>
    );
  }

  const referenceApprovers = (document.approval_lines || [])
    .filter((line) => line.approval_type === "reference")
    .map((line) => `${line.approver_name}${line.approver_position ? ` ${line.approver_position}` : ""}`)
    .join(", ");

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{document.title}</h1>
            <p className="text-sm text-gray-500">
              {document.template_name && <span className="text-sky-600">[{document.template_name}]</span>}
              {" "}문서번호: {document.document_number || "-"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={document.status} />
          <button className="p-2 rounded-lg hover:bg-gray-100" title="인쇄">
            <Printer size={20} className="text-gray-500" />
          </button>
        </div>
      </div>

      {/* 결재선 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">결재선</h3>
        <div className="flex items-center gap-3 overflow-x-auto pb-2">
          {document.approval_lines?.map((line, idx) => (
            <React.Fragment key={line.id}>
              <ApprovalStamp
                status={line.status}
                approver={{
                  name: line.approver_name,
                  position: line.approver_position,
                }}
                actedAt={line.acted_at}
                order={idx + 1}
                size="lg"
              />
              {idx < document.approval_lines.length - 1 && (
                <div className="text-gray-300 text-2xl">→</div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* 문서 정보 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">문서 정보</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-500">상신자</span>
            <p className="font-medium text-gray-900">
              {document.author_name} {document.author_position}
            </p>
            <p className="text-xs text-gray-400">{document.author_department}</p>
          </div>
          <div>
            <span className="text-gray-500">상태</span>
            <p className="font-medium text-gray-900">{document.status_display || document.status || "-"}</p>
          </div>
          <div>
            <span className="text-gray-500">참조</span>
            <p className="font-medium text-gray-900">{referenceApprovers || "-"}</p>
          </div>
        </div>
      </div>

      {/* 문서 내용 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">문서 내용</h3>
        <div
          className="prose prose-sm max-w-none text-gray-800"
          dangerouslySetInnerHTML={{ __html: document.content || "<p>내용 없음</p>" }}
        />
      </div>

      {/* 첨부파일 */}
      {document.attachments?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <Paperclip size={16} />
            첨부파일 ({document.attachments.length})
          </h3>
          <div className="space-y-2">
            {document.attachments.map((att) => (
              <div
                key={att.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FileEdit size={18} className="text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{att.filename}</p>
                    <p className="text-xs text-gray-500">
                      {(att.file_size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDownload(att)}
                  className="p-2 rounded-lg hover:bg-gray-200"
                  title="다운로드"
                >
                  <Download size={16} className="text-gray-500" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 결재 이력 타임라인 */}
      <ApprovalTimeline actions={document.actions || []} />

      {/* 결재 처리 영역 */}
      {isMyTurn() && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <MessageSquare size={16} />
            결재 처리
          </h3>
          <textarea
            value={decisionComment}
            onChange={(e) => setDecisionComment(e.target.value)}
            placeholder="의견을 입력하세요 (선택사항)"
            className="w-full p-3 border border-gray-300 rounded-lg resize-none h-24 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
          />
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={() => handleDecision("approve")}
              disabled={processing}
              className="flex items-center gap-2 px-5 py-2.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
            >
              <CheckCircle size={18} />
              승인
            </button>
            <button
              onClick={() => handleDecision("reject")}
              disabled={processing}
              className="flex items-center gap-2 px-5 py-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
            >
              <XCircle size={18} />
              반려
            </button>
          </div>
        </div>
      )}

      {/* 작성자 액션 (취소/수정) */}
      {isAuthor() && document.status === "pending" && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <button
              onClick={handleCancel}
              disabled={processing}
              className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              <Trash2 size={16} />
              문서 취소
            </button>
          </div>
        </div>
      )}

      {isAuthor() && document.status === "draft" && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/approval/${id}/edit`)}
              className="flex items-center gap-2 px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors"
            >
              <FileEdit size={16} />
              수정
            </button>
            <button
              onClick={handleCancel}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Trash2 size={16} />
              삭제
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
