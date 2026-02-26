import React from "react";
import { AlertTriangle, Bell } from "lucide-react";

const isUrgentNotification = (notification) =>
  Boolean(notification?.is_urgent || notification?.priority === "urgent");

const formatDateTime = (value) => {
  if (!value) return "";
  try {
    return new Date(value).toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch (err) {
    return "";
  }
};

export default function NotificationToastItem({ notification }) {
  const urgent = isUrgentNotification(notification);

  return (
    <div className="w-full">
      <div className="p-4 flex gap-3 items-start">
        <div className="shrink-0">
          {urgent ? (
            <div className="p-2 rounded-full bg-red-100">
              <AlertTriangle size={20} className="text-red-600" />
            </div>
          ) : (
            <div className="p-2 rounded-full bg-blue-100">
              <Bell size={20} className="text-blue-600" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-1">
          <div className="text-sm font-bold leading-snug text-gray-900">
            {notification?.title || "새 알림"}
          </div>
          <div className="text-xs text-gray-700 break-words">
            {notification?.message || ""}
          </div>
          <div className="text-[11px] text-gray-500 font-medium">
            {formatDateTime(notification?.created_at)}
          </div>
        </div>
      </div>
    </div>
  );
}
