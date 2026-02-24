// src/pages/approval/ApprovalDetail.jsx
import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { createPortal } from "react-dom";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import {
  ArrowLeft,
  FileEdit,
  CheckCircle,
  XCircle,
  MessageSquare,
  Printer,
  Download,
  Paperclip,
  Trash2,
} from "lucide-react";
import ApprovalTimeline from "./components/ApprovalTimeline";

const APPROVAL_LINE_TYPE_SET = new Set(["approval", "agreement", "reference"]);
const MAX_REFERENCE_LABELS = 7;

const normalizeApprovalType = (value) =>
  APPROVAL_LINE_TYPE_SET.has(value) ? value : "approval";

const getApprovalStageLabel = (line = {}) => {
  if (normalizeApprovalType(line.approval_type) === "agreement") return "합의";
  return "결재";
};

const formatApprovalDateTime = (dateStr) => {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  const formattedDate = date
    .toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
    .replace(/\. /g, "-")
    .replace(".", "");
  const formattedTime = date.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${formattedDate} ${formattedTime}`;
};

const StatusBadge = ({ status }) => {
  const styles = {
    draft: "bg-gray-100 text-gray-600",
    pending: "bg-blue-100 text-blue-600",
    approved: "bg-green-100 text-green-600",
    rejected: "bg-red-100 text-red-600",
    canceled: "bg-gray-100 text-gray-500",
  };

  const labels = {
    draft: "임시저장",
    pending: "진행중",
    approved: "승인",
    rejected: "반려",
    canceled: "취소",
  };

  return (
    <span
      className={`px-2 py-0.5 text-xs rounded-full ${
        styles[status] || styles.draft
      }`}
    >
      {labels[status] || status}
    </span>
  );
};

export default function ApprovalDetail() {
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();

  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [decisionComment, setDecisionComment] = useState("");
  const [processing, setProcessing] = useState(false);
  const [showReferenceOverflow, setShowReferenceOverflow] = useState(false);
  const [referenceOverflowPosition, setReferenceOverflowPosition] = useState({
    top: 0,
    left: 0,
  });
  const referenceOverflowButtonRef = useRef(null);
  const referenceOverflowPopoverRef = useRef(null);

  const getCurrentUserIdCandidates = () =>
    [user?.id, user?.user_id]
      .filter((value) => value != null)
      .map((value) => String(value));

  const getCurrentUserNameCandidates = () => {
    const fullName = `${user?.last_name || ""}${user?.first_name || ""}`.trim();
    return [user?.username, user?.name, fullName]
      .filter((value) => Boolean(value))
      .map((value) => String(value).trim());
  };

  const matchesCurrentUserId = (value) => {
    if (value == null) return false;
    return getCurrentUserIdCandidates().includes(String(value));
  };

  const matchesCurrentUserName = (value) => {
    if (!value) return false;
    return getCurrentUserNameCandidates().includes(String(value).trim());
  };

  // 문서 로드
  const loadDocument = async () => {
    setShowReferenceOverflow(false);
    try {
      const filter = new URLSearchParams(location.search).get("filter");
      const requestConfig = filter ? { params: { filter } } : undefined;
      const res = await api.get(`/approval/documents/${id}/`, requestConfig);
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
  }, [id, location.search]);

  const updateReferenceOverflowPosition = () => {
    if (!referenceOverflowButtonRef.current) return;
    const rect = referenceOverflowButtonRef.current.getBoundingClientRect();
    setReferenceOverflowPosition({
      top: rect.top - 8,
      left: rect.right,
    });
  };

  const handleReferenceOverflowToggle = () => {
    if (showReferenceOverflow) {
      setShowReferenceOverflow(false);
      return;
    }
    updateReferenceOverflowPosition();
    setShowReferenceOverflow(true);
  };

  useEffect(() => {
    if (!showReferenceOverflow) return;

    const handleClickOutside = (event) => {
      const target = event.target;
      if (referenceOverflowButtonRef.current?.contains(target)) return;
      if (referenceOverflowPopoverRef.current?.contains(target)) return;
      setShowReferenceOverflow(false);
    };

    const handleViewportChange = () => {
      updateReferenceOverflowPosition();
    };

    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);
    window.document.addEventListener("mousedown", handleClickOutside);

    return () => {
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
      window.document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showReferenceOverflow]);

  const isMyTurn = () => {
    if (!document || !user || document.status !== "pending") return false;

    return (document.approval_lines || []).some((line) => {
      const isActionable =
        normalizeApprovalType(line?.approval_type) !== "reference";
      const isPending = line?.status === "pending";
      const isMe =
        matchesCurrentUserId(line?.approver) ||
        matchesCurrentUserName(line?.approver_name);

      return isActionable && isPending && isMe;
    });
  };

  // 문서 작성자인지 확인
  const isAuthor = () => {
    if (!document || !user) return false;
    return (
      matchesCurrentUserId(document.author) ||
      matchesCurrentUserName(document.author_name)
    );
  };

  const canCancelSubmission = () => {
    if (!document || !isAuthor() || document.status !== "pending") return false;

    const hasAnyDecision = (document.approval_lines || []).some(
      (line) =>
        line?.approval_type !== "reference" &&
        line?.acted_at &&
        ["approved", "rejected", "skipped"].includes(line?.status),
    );

    return !hasAnyDecision;
  };

  const handleDecision = async (action) => {
    const confirmMessage =
      action === "approve" ? "승인하시겠습니까?" : "반려하시겠습니까?";

    if (!window.confirm(confirmMessage)) return;

    setProcessing(true);
    try {
      await api.post(`/approval/documents/${id}/decide/`, {
        action,
        comment: decisionComment,
      });
      alert(action === "approve" ? "승인되었습니다." : "반려되었습니다.");
      setDecisionComment("");
      await loadDocument();
    } catch (err) {
      console.error("Decision failed:", err);
      alert("처리 중 오류가 발생했습니다.");
    } finally {
      setProcessing(false);
    }
  };

  // 상신 취소
  const handleCancel = async () => {
    if (!window.confirm("문서를 취소(회수)하시겠습니까?")) {
      return;
    }

    setProcessing(true);
    try {
      await api.post(`/approval/documents/${id}/cancel/`, {});
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
      const res = await api.get(
        `/approval/attachments/${attachment.id}/download/`,
        {
          responseType: "blob",
        },
      );
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = window.document.createElement("a");
      link.href = url;
      link.setAttribute("download", attachment.filename);
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
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

  const referenceUsers = (document.approval_lines || [])
    .filter((line) => line.approval_type === "reference")
    .map((line) => ({
      id: line.id,
      name: line.approver_name || "미지정",
      position: line.approver_position || "",
    }));
  const visibleReferenceUsers = referenceUsers.slice(0, MAX_REFERENCE_LABELS);
  const hiddenReferenceUsers = referenceUsers.slice(MAX_REFERENCE_LABELS);
  const hasOverflowReferenceUsers =
    referenceUsers.length > MAX_REFERENCE_LABELS;
  const sortedApprovalLines = (document.approval_lines || [])
    .filter((line) => normalizeApprovalType(line.approval_type) !== "reference")
    .sort((a, b) => Number(a?.order ?? 0) - Number(b?.order ?? 0));
  const filteredApprovalLines =
    document.author == null
      ? sortedApprovalLines
      : sortedApprovalLines.filter(
          (line) => String(line?.approver) !== String(document.author),
        );
  const approvalColumns = [
    {
      id: `draft-${document.id}`,
      stage_label: "기안",
      approver_name: document.author_name || "미지정",
      approver_position: document.author_position || "",
      status: "approved",
      approver_sign: document.author_sign || null,
      acted_at: document.submitted_at || document.drafted_at || null,
    },
    ...filteredApprovalLines,
  ];

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
            <h1 className="text-xl font-bold text-gray-900">
              {document.title}
            </h1>
            <p className="text-sm text-gray-500">
              {document.template_name && (
                <span className="text-sky-600">[{document.template_name}]</span>
              )}{" "}
              문서번호: {document.document_number || "-"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canCancelSubmission() && (
            <button
              onClick={handleCancel}
              disabled={processing}
              className="flex items-center gap-2 px-3 py-1.5 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              <Trash2 size={16} />
              상신 취소
            </button>
          )}
          <button className="p-2 rounded-lg hover:bg-gray-100" title="인쇄">
            <Printer size={20} className="text-gray-500" />
          </button>
        </div>
      </div>

      {/* 결재선 + 결재 이력 */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">결재선</h3>
            {approvalColumns.length === 0 ? (
              <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                <p>결재선 정보가 없습니다.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="doc-table table-fixed">
                  <colgroup>
                    {approvalColumns.map((line, idx) => (
                      <col
                        key={`${line.id || "line-col"}-${idx}`}
                        style={{ width: "170px" }}
                      />
                    ))}
                  </colgroup>
                  <thead className="doc-thead">
                    <tr>
                      {approvalColumns.map((line, idx) => (
                        <th
                          key={`${line.id || "line-head"}-${idx}`}
                          className={
                            idx === approvalColumns.length - 1
                              ? "doc-th-end"
                              : "doc-th"
                          }
                        >
                          {line.stage_label || getApprovalStageLabel(line)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {approvalColumns.map((line, idx) => (
                        <td
                          key={`${line.id || "line-body"}-${idx}`}
                          className="doc-td h-28 text-center"
                        >
                          <div className="flex h-full flex-col items-center justify-center gap-1.5 py-1">
                            <p className="whitespace-nowrap text-lg text-gray-900">
                              {line.approver_name || "미지정"}
                              {line.approver_position
                                ? ` ${line.approver_position}`
                                : ""}
                            </p>
                            <div className="flex h-14 w-40 items-center justify-center overflow-hidden">
                              {line.status === "approved" &&
                              line.approver_sign ? (
                                <img
                                  src={line.approver_sign}
                                  alt={`${line.approver_name || "사용자"} 서명`}
                                  className="h-full w-full object-contain"
                                />
                              ) : (
                                <>
                                  {line.status === "approved" && (
                                    <CheckCircle
                                      size={38}
                                      className="text-gray-500"
                                    />
                                  )}
                                  {line.status === "rejected" && (
                                    <XCircle
                                      size={38}
                                      className="text-red-500"
                                    />
                                  )}
                                </>
                              )}
                            </div>
                            <p className="text-xs text-gray-500">
                              {formatApprovalDateTime(line.acted_at)}
                            </p>
                          </div>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
        <div className="xl:row-span-2">
          {isMyTurn() ? (
            <div className="h-[450px] bg-white rounded-xl border border-gray-200 p-5 flex flex-col min-h-0">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <MessageSquare size={16} />
                결재 처리
              </h3>
              <textarea
                value={decisionComment}
                onChange={(e) => setDecisionComment(e.target.value)}
                placeholder="의견을 입력하세요 (선택사항)"
                className="w-full flex-1 min-h-[220px] p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
              />
              <div className="mt-4 flex items-center justify-center gap-3">
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
          ) : (
            <ApprovalTimeline actions={document.actions || []} />
          )}
        </div>
        <div className="xl:col-span-2">
          {/* 문서 정보 */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">
              문서 정보
            </h3>
            <div className="overflow-x-auto">
              <table className="doc-table table-fixed w-full">
                <colgroup>
                  <col style={{ width: "12.5%" }} />
                  <col style={{ width: "9%" }} />
                </colgroup>
                <thead className="doc-thead">
                  <tr>
                    <th className="doc-th">상신자</th>
                    <th className="doc-th">상태</th>
                    <th className="doc-th-end">참조</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="doc-td h-16 px-5">
                      <div className="flex flex-col items-center text-center">
                        <p className="font-medium text-gray-900">
                          {document.author_name} {document.author_position}
                        </p>
                        <p className="text-xs text-gray-500">
                          {document.author_department || "-"}
                        </p>
                      </div>
                    </td>
                    <td className="doc-td h-16 px-5 text-center">
                      <StatusBadge status={document.status} />
                    </td>
                    <td className="doc-td h-16 px-5 text-center">
                      {referenceUsers.length === 0 ? (
                        <p className="font-medium text-gray-900">-</p>
                      ) : (
                        <div className="flex justify-center gap-2 py-0.5">
                          {visibleReferenceUsers.map((refUser, idx) => (
                            <div
                              key={`${refUser.id || "reference"}-${idx}`}
                              className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-700"
                            >
                              <span className="font-medium text-gray-800">
                                {refUser.name}
                              </span>
                              {refUser.position && (
                                <span className="text-gray-500">
                                  {refUser.position}
                                </span>
                              )}
                            </div>
                          ))}
                          {hasOverflowReferenceUsers && (
                            <>
                              <button
                                type="button"
                                ref={referenceOverflowButtonRef}
                                onClick={handleReferenceOverflowToggle}
                                className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-100"
                                aria-label="숨겨진 참조인 보기"
                              >
                                +{hiddenReferenceUsers.length}
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* 문서 내용 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">문서 내용</h3>
        <div
          className="prose prose-sm max-w-none text-gray-800"
          dangerouslySetInnerHTML={{
            __html: document.content || "<p>내용 없음</p>",
          }}
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
                    <p className="text-sm font-medium text-gray-900">
                      {att.filename}
                    </p>
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

      {showReferenceOverflow &&
        createPortal(
          <div
            ref={referenceOverflowPopoverRef}
            className="fixed z-[70] w-80 rounded-lg border border-gray-200 bg-white p-3 text-left shadow-lg"
            style={{
              top: referenceOverflowPosition.top,
              left: referenceOverflowPosition.left,
              transform: "translate(-100%, -100%)",
            }}
          >
            <p className="mb-2 text-xs font-semibold text-gray-500">
              추가 참조인
            </p>
            <div className="flex flex-wrap gap-2">
              {hiddenReferenceUsers.map((refUser, idx) => (
                <div
                  key={`${refUser.id || "hidden-reference"}-${idx}`}
                  className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-700"
                >
                  <span className="font-medium text-gray-800">
                    {refUser.name}
                  </span>
                  {refUser.position && (
                    <span className="text-gray-500">{refUser.position}</span>
                  )}
                </div>
              ))}
            </div>
          </div>,
          window.document.body,
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
