// src/pages/approval/components/ApprovalStamp.jsx
import React from "react";
import { CheckCircle, XCircle, Clock, User } from "lucide-react";

export default function ApprovalStamp({
  status = "waiting",
  approver = {},
  actedAt,
  order,
  size = "md",
  isMe = false,
}) {
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

  const sizeConfig = {
    sm: {
      container: "px-2 py-1.5 min-w-[70px]",
      name: "text-xs",
      position: "text-[11px]",
      date: "text-[10px]",
      statusIcon: 12,
      meSlot: "w-4",
      meBadge: "h-4 min-w-4 px-1 text-[10px]",
      pendingBadge: "text-[10px]",
    },
    md: {
      container: "px-3 py-2 min-w-[90px]",
      name: "text-xs",
      position: "text-[11px]",
      date: "text-[10px]",
      statusIcon: 14,
      meSlot: "w-5",
      meBadge: "h-5 min-w-5 px-1 text-[10px]",
      pendingBadge: "text-[10px]",
    },
    lg: {
      container: "px-4 py-3 min-w-[110px]",
      name: "text-sm",
      position: "text-xs",
      date: "text-[11px]",
      statusIcon: 16,
      meSlot: "w-6",
      meBadge: "h-5 min-w-5 px-1 text-[10px]",
      pendingBadge: "text-[11px]",
    },
  };

  const sizeStyle = sizeConfig[size] || sizeConfig.md;

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date
      .toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
      .replace(/\. /g, "-")
      .replace(".", "");
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
        ${isMe ? "bg-amber-50 border-amber-300" : `${config.bg} ${config.border}`} border rounded-lg
        ${sizeStyle.container}
        flex flex-col items-center text-center
        transition-all
      `}
    >
      <div className="mb-0.5 flex w-full items-center justify-center">
        <div className="grid grid-cols-[auto_auto_auto] items-center gap-1">
          <div className={`${sizeStyle.meSlot} flex justify-end`}>
            {isMe && (
              <span
                className={`inline-flex items-center justify-center rounded-full bg-amber-200 font-semibold leading-none text-amber-900 ${sizeStyle.meBadge}`}
              >
                나
              </span>
            )}
          </div>
          <StatusIcon
            size={sizeStyle.statusIcon}
            className={`${config.iconColor} shrink-0`}
          />
          <div className={sizeStyle.meSlot} />
        </div>
      </div>

      <div className="flex max-w-full items-center">
        <div
          className={`max-w-full truncate font-medium ${config.text} ${sizeStyle.name}`}
        >
          {approver.name || "미정"}
        </div>
      </div>

      {approver.position && (
        <div
          className={`max-w-full truncate text-gray-500 ${sizeStyle.position}`}
        >
          {approver.position}
        </div>
      )}

      {actedAt && (
        <div className={`mt-0.5 text-gray-400 ${sizeStyle.date}`}>
          {formatDate(actedAt)}
          <br />
          {formatTime(actedAt)}
        </div>
      )}

      {order && status === "pending" && (
        <div
          className={`mt-0.5 rounded-full bg-blue-500 px-1.5 py-0.5 font-medium text-white ${sizeStyle.pendingBadge}`}
        >
          결재중
        </div>
      )}
    </div>
  );
}
