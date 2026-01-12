// src/components/notification/NotificationPanel.jsx
import React, { useState, useEffect, useCallback } from "react";
import api from "../../api/axios";
import { X, Bell, Trash2, Check, CheckCheck } from "lucide-react";

// 알림 유형 아이콘/색상
const getTypeConfig = (type) => {
  const configs = {
    system: { bg: "bg-gray-100", icon: "🔔" },
    notice: { bg: "bg-blue-100", icon: "📢" },
    approval: { bg: "bg-green-100", icon: "📝" },
    schedule: { bg: "bg-purple-100", icon: "📅" },
    message: { bg: "bg-yellow-100", icon: "💬" },
  };
  return configs[type] || configs.system;
};

// 시간 포맷
const formatTime = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diff = (now - date) / 1000 / 60; // 분

  if (diff < 1) return "방금 전";
  if (diff < 60) return `${Math.floor(diff)}분 전`;
  if (diff < 60 * 24) return `${Math.floor(diff / 60)}시간 전`;
  return date.toLocaleDateString('ko-KR');
};

export default function NotificationPanel({ isOpen, onClose }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  // 알림 로드
  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("chat/notifications/");
      setNotifications(res.data?.results ?? res.data ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen, loadNotifications]);

  // 읽음 처리
  const handleMarkRead = async (id) => {
    try {
      await api.post(`chat/notifications/${id}/mark-read/`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) {
      console.error(err);
    }
  };

  // 전체 읽음
  const handleMarkAllRead = async () => {
    try {
      await api.post("chat/notifications/mark-all-read/");
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  // 삭제
  const handleDelete = async (id) => {
    try {
      await api.delete(`chat/notifications/${id}/`);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (!isOpen) return null;

  return (
    <div className="absolute top-12 right-0 w-96 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
      {/* 헤더 */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell size={18} className="text-blue-600" />
          <span className="font-semibold">알림</span>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">{unreadCount}개의 새 알림</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-xs text-blue-600 hover:underline flex items-center gap-1"
            >
              <CheckCheck size={14} />
              모두 읽음
            </button>
          )}
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* 알림 목록 */}
      <div className="max-h-[400px] overflow-y-auto divide-y divide-gray-100">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Bell size={36} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">추가로 표시할 알림이 없습니다.</p>
            <p className="text-xs mt-1">알림은 최대 7일간 보관됩니다.</p>
          </div>
        ) : (
          notifications.map((notif) => {
            const config = getTypeConfig(notif.notification_type);
            return (
              <div
                key={notif.id}
                className={`p-4 hover:bg-gray-50 flex items-start gap-3 ${!notif.is_read ? 'bg-blue-50' : ''}`}
              >
                <div className={`w-8 h-8 ${config.bg} rounded-full flex items-center justify-center text-lg shrink-0`}>
                  {config.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm text-gray-900">{notif.title}</p>
                      {notif.type_display && (
                        <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                          {notif.type_display}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap">{formatTime(notif.created_at)}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">{notif.message}</p>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  {!notif.is_read && (
                    <button
                      onClick={() => handleMarkRead(notif.id)}
                      className="p-1 text-green-500 hover:bg-green-50 rounded"
                      title="읽음"
                    >
                      <Check size={14} />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(notif.id)}
                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                    title="삭제"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
