// src/pages/approval/components/ApprovalStamp.jsx
import React from "react";
import { CheckCircle, XCircle, Clock, User } from "lucide-react";

/**
 * 결재 도장 컴포넌트
 * @param {string} status - 결재 상태 (approved, pending, rejected, waiting)
 * @param {object} approver - 결재자 정보 { name, position }
 * @param {string} actedAt - 처리일
 * @param {number} order - 결재 순서
 * @param {string} size - 크기 (sm, md, lg)
 */
export default function ApprovalStamp({
  status = "waiting",
  approver = {},
  actedAt,
  order,
  size = "md",
}) {
  // 상태별 색상 설정
  const statusConfig = {
    approved: {
      bg: "bg-green-50",
      border: "border-green-400",
      text: "text-green-700",
      icon: CheckCircle,
      iconColor: "text-green-500",
    },
    pending: {
      bg: "bg-blue-50",
      border: "border-blue-400",
      text: "text-blue-700",
      icon: Clock,
      iconColor: "text-blue-500",
    },
    rejected: {
      bg: "bg-red-50",
      border: "border-red-400",
      text: "text-red-700",
      icon: XCircle,
      iconColor: "text-red-500",
    },
    waiting: {
      bg: "bg-gray-50",
      border: "border-gray-300",
      text: "text-gray-500",
      icon: User,
      iconColor: "text-gray-400",
    },
    skipped: {
      bg: "bg-gray-50",
      border: "border-gray-300",
      text: "text-gray-400",
      icon: User,
      iconColor: "text-gray-300",
    },
  };

  const config = statusConfig[status] || statusConfig.waiting;
  const StatusIcon = config.icon;

  // 크기별 스타일
  const sizeConfig = {
    sm: {
      container: "px-2 py-1.5 min-w-[70px]",
      name: "text-[11px]",
      position: "text-[10px]",
      date: "text-[9px]",
      icon: 10,
      statusIcon: 12,
    },
    md: {
      container: "px-3 py-2 min-w-[90px]",
      name: "text-xs",
      position: "text-[11px]",
      date: "text-[10px]",
      icon: 12,
      statusIcon: 14,
    },
    lg: {
      container: "px-4 py-3 min-w-[110px]",
      name: "text-sm",
      position: "text-xs",
      date: "text-[11px]",
      icon: 14,
      statusIcon: 16,
    },
  };

  const sizeStyle = sizeConfig[size] || sizeConfig.md;

  // 날짜 포맷
  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).replace(/\. /g, "-").replace(".", "");
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div
      className={`
        ${config.bg} ${config.border} border rounded-lg
        ${sizeStyle.container}
        flex flex-col items-center text-center
        transition-all
      `}
    >
      {/* 상태 아이콘 */}
      <div className="flex items-center justify-center mb-0.5">
        <StatusIcon size={sizeStyle.statusIcon} className={config.iconColor} />
      </div>

      {/* 결재자 이름 */}
      <div className={`font-medium ${config.text} ${sizeStyle.name} truncate max-w-full`}>
        {approver.name || "미지정"}
      </div>

      {/* 직위 */}
      {approver.position && (
        <div className={`text-gray-500 ${sizeStyle.position} truncate max-w-full`}>
          {approver.position}
        </div>
      )}

      {/* 처리일 */}
      {actedAt && (
        <div className={`text-gray-400 ${sizeStyle.date} mt-0.5`}>
          {formatDate(actedAt)}
          {size !== "sm" && <br />}
          {size !== "sm" && formatTime(actedAt)}
        </div>
      )}

      {/* 순서 표시 (선택적) */}
      {order && status === "pending" && (
        <div className={`mt-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-blue-500 text-white`}>
          {order} 결재중
        </div>
      )}
    </div>
  );
}
