// src/pages/approval/components/ApprovalTimeline.jsx
import React from "react";
import {
  Send,
  CheckCircle,
  XCircle,
  RotateCcw,
  MessageCircle,
  Clock,
} from "lucide-react";

/**
 * 결재 이력 타임라인 컴포넌트
 * @param {array} actions - 결재 액션 목록
 */
export default function ApprovalTimeline({ actions = [] }) {
  // 액션별 설정
  const actionConfig = {
    submit: {
      icon: Send,
      bg: "bg-blue-100",
      iconColor: "text-blue-500",
      label: "상신",
    },
    approve: {
      icon: CheckCircle,
      bg: "bg-green-100",
      iconColor: "text-green-500",
      label: "승인",
    },
    reject: {
      icon: XCircle,
      bg: "bg-red-100",
      iconColor: "text-red-500",
      label: "반려",
    },
    cancel: {
      icon: RotateCcw,
      bg: "bg-gray-100",
      iconColor: "text-gray-500",
      label: "취소",
    },
    return: {
      icon: RotateCcw,
      bg: "bg-orange-100",
      iconColor: "text-orange-500",
      label: "회수",
    },
    comment: {
      icon: MessageCircle,
      bg: "bg-purple-100",
      iconColor: "text-purple-500",
      label: "의견",
    },
  };

  // 날짜 포맷
  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date
      .toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
      .replace(/\. /g, "-")
      .replace(".", "");
  };

  if (actions.length === 0) {
    return null;
  }

  return (
    <div className="h-[450px] bg-white rounded-xl border border-gray-200 p-5 flex flex-col min-h-0">
      <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
        <Clock size={16} />
        결재 이력
      </h3>

      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        <div className="relative">
          {/* 타임라인 선 */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>

          {/* 타임라인 아이템 */}
          <div className="space-y-4">
            {actions.map((action, idx) => {
              const config =
                actionConfig[action.action] || actionConfig.comment;
              const Icon = config.icon;

              return (
                <div key={action.id || idx} className="relative pl-10">
                  {/* 아이콘 */}
                  <div
                    className={`absolute left-0 w-8 h-8 rounded-full ${config.bg} flex items-center justify-center`}
                  >
                    <Icon size={16} className={config.iconColor} />
                  </div>

                  {/* 내용 */}
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">
                          {action.actor_name}
                        </span>
                        {action.actor_position && (
                          <span className="text-xs text-gray-500">
                            {action.actor_position}
                          </span>
                        )}
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${config.bg} ${config.iconColor.replace("text-", "text-")}`}
                        >
                          {action.action_display || config.label}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400">
                        {formatDate(action.created_at)}
                      </span>
                    </div>

                    {action.comment && (
                      <p className="text-sm text-gray-600 mt-1">
                        {action.comment}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
