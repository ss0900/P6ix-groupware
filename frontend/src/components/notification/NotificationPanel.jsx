import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bell, Check, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../api/axios";
import NotificationToastItem from "./NotificationToastItem";
import "./NotificationPanel.css";

const PAGE_SIZE = 10;

const toList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
};

const getNotificationUrl = (notification) => {
  const candidates = [
    notification?.target_url,
    notification?.action_url,
    notification?.url,
    notification?.link,
  ].filter(Boolean);

  if (!candidates.length) return null;
  const value = String(candidates[0]).trim();
  if (!value) return null;

  if (/^https?:\/\//i.test(value)) return value;
  return value.startsWith("/") ? value : `/${value}`;
};

const isUrgentNotification = (notification) =>
  Boolean(notification?.is_urgent || notification?.priority === "urgent");

export default function NotificationPanel({
  isOpen,
  onClose,
  buttonRef,
  onUnreadCountChange,
}) {
  const [notifications, setNotifications] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const dropdownRef = useRef(null);
  const scrollRef = useRef(null);
  const prevIdsRef = useRef(new Set());
  const pollingRef = useRef(null);

  const visibleNotifications = useMemo(
    () => notifications.slice(0, page * PAGE_SIZE),
    [notifications, page]
  );

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.is_read).length,
    [notifications]
  );

  const syncUnreadCount = useCallback(
    (list) => {
      if (!onUnreadCountChange) return;
      const count = list.filter((item) => !item.is_read).length;
      onUnreadCountChange(count);
    },
    [onUnreadCountChange]
  );

  const replaceNotifications = useCallback(
    (list, resetPage = false) => {
      setNotifications(list);
      syncUnreadCount(list);
      if (resetPage) setPage(1);
    },
    [syncUnreadCount]
  );

  const loadLatestNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("chat/notifications/");
      const list = toList(res.data);
      replaceNotifications(list, true);
      prevIdsRef.current = new Set(list.map((item) => item.id));
    } catch (err) {
      console.error("notification load error", err);
    } finally {
      setLoading(false);
    }
  }, [replaceNotifications]);

  const showBrowserNotification = useCallback((notification) => {
    if (typeof window === "undefined") return;
    if (!document.hidden) return;
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    const targetUrl = getNotificationUrl(notification);
    const title = notification?.title || "새 알림";
    const body = notification?.message || "";

    const nativeNotification = new Notification(title, {
      body,
      icon: "/logo192.png",
      tag: `notification-${notification.id}`,
    });

    nativeNotification.onclick = () => {
      window.focus();
      if (targetUrl) window.location.href = targetUrl;
      nativeNotification.close();
    };
  }, []);

  const pollNotifications = useCallback(async () => {
    try {
      const res = await api.get("chat/notifications/");
      const list = toList(res.data);

      if (prevIdsRef.current.size === 0) {
        prevIdsRef.current = new Set(list.map((item) => item.id));
        replaceNotifications(list);
        return;
      }

      const previousIds = prevIdsRef.current;
      const newUnread = list.filter(
        (item) => !previousIds.has(item.id) && !item.is_read && !isOpen
      );

      newUnread.forEach((notification) => {
        toast.custom(
          (toastState) => (
            <div
              className={[
                "pointer-events-auto max-w-[380px] rounded-lg shadow-xl cursor-pointer",
                isUrgentNotification(notification)
                  ? "toast-urgent-gradient"
                  : "toast-normal-gradient",
                toastState.visible ? "toast-enter" : "toast-leave",
              ].join(" ")}
              onClick={() => toast.dismiss(toastState.id)}
            >
              <NotificationToastItem notification={notification} />
            </div>
          ),
          { duration: isUrgentNotification(notification) ? 6000 : 3500 }
        );

        showBrowserNotification(notification);
      });

      prevIdsRef.current = new Set(list.map((item) => item.id));
      replaceNotifications(list);
    } catch (err) {
      console.error("notification polling error", err);
    }
  }, [isOpen, replaceNotifications, showBrowserNotification]);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      const timer = setTimeout(() => {
        Notification.requestPermission().catch(() => {});
      }, 3000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, []);

  useEffect(() => {
    pollNotifications();
    pollingRef.current = setInterval(pollNotifications, 10000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [pollNotifications]);

  useEffect(() => {
    if (isOpen) loadLatestNotifications();
  }, [isOpen, loadLatestNotifications]);

  useEffect(() => {
    if (!isOpen) return;
    const handleOutside = (event) => {
      const clickedPanel = dropdownRef.current?.contains(event.target);
      const clickedButton = buttonRef?.current?.contains(event.target);
      if (!clickedPanel && !clickedButton) onClose?.();
    };

    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [buttonRef, isOpen, onClose]);

  useEffect(() => {
    if (!notifications.length) {
      if (page !== 1) setPage(1);
      return;
    }
    const maxPage = Math.max(1, Math.ceil(notifications.length / PAGE_SIZE));
    if (page > maxPage) setPage(maxPage);
  }, [notifications.length, page]);

  useEffect(() => {
    if (!isOpen) return;
    const el = scrollRef.current;
    if (!el) return;

    let loadingTop = false;
    const handleScroll = async () => {
      const reachedBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 5;
      if (reachedBottom) {
        setPage((prev) => {
          const next = prev + 1;
          return notifications.length > prev * PAGE_SIZE ? next : prev;
        });
      }

      if (el.scrollTop === 0 && !loadingTop) {
        loadingTop = true;
        await loadLatestNotifications();
        setTimeout(() => {
          loadingTop = false;
        }, 300);
      }
    };

    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, [isOpen, loadLatestNotifications, notifications.length]);

  const markAsRead = useCallback(
    async (id) => {
      await api.post(`chat/notifications/${id}/mark-read/`);
      setNotifications((prev) => {
        const next = prev.map((item) =>
          item.id === id ? { ...item, is_read: true } : item
        );
        syncUnreadCount(next);
        return next;
      });
    },
    [syncUnreadCount]
  );

  const handleItemClick = async (notification) => {
    try {
      if (!notification.is_read) {
        await markAsRead(notification.id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      const targetUrl = getNotificationUrl(notification);
      onClose?.();
      if (targetUrl) window.location.href = targetUrl;
    }
  };

  const handleMarkAllRead = async () => {
    try {
      if (!notifications.length) return;
      if (!window.confirm("모든 알림을 읽음 처리하시겠습니까?")) return;

      await api.post("chat/notifications/mark-all-read/");
      const next = notifications.map((item) => ({ ...item, is_read: true }));
      setNotifications(next);
      syncUnreadCount(next);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteOne = async (id) => {
    try {
      await api.delete(`chat/notifications/${id}/`);
      setNotifications((prev) => {
        const next = prev.filter((item) => item.id !== id);
        syncUnreadCount(next);
        return next;
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteAll = async () => {
    try {
      if (!notifications.length) return;
      if (!window.confirm("모든 알림을 삭제하시겠습니까?")) return;

      await Promise.allSettled(
        notifications.map((item) => api.delete(`chat/notifications/${item.id}/`))
      );
      setNotifications([]);
      syncUnreadCount([]);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div
      ref={dropdownRef}
      className={[
        "absolute right-0 top-12 w-[400px] max-h-[520px] rounded-xl bg-white shadow-2xl z-50 border border-gray-100",
        isOpen ? "dropdown-fade-in" : "hidden",
      ].join(" ")}
    >
      <div className="px-5 py-4 border-b border-gray-100 rounded-t-xl bg-gradient-to-r from-blue-50/50 to-indigo-50/50">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[15px] font-black text-slate-900 tracking-tight">
              알림 센터
            </h3>
            {unreadCount > 0 && (
              <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                {unreadCount} New
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleMarkAllRead}
              disabled={unreadCount === 0}
              className="flex-1 py-1.5 rounded-lg bg-white border border-slate-200 text-[11px] font-bold text-slate-600 hover:bg-slate-50 hover:border-blue-200 hover:text-blue-600 disabled:opacity-40 disabled:hover:bg-white disabled:hover:border-slate-200 disabled:hover:text-slate-600 transition-all"
            >
              전체 읽음
            </button>
            <button
              onClick={handleDeleteAll}
              disabled={notifications.length === 0}
              className="flex-1 py-1.5 rounded-lg bg-white border border-slate-200 text-[11px] font-bold text-slate-600 hover:bg-red-50 hover:border-red-200 hover:text-red-600 disabled:opacity-40 disabled:hover:bg-white disabled:hover:border-slate-200 disabled:hover:text-slate-600 transition-all"
            >
              전체 삭제
            </button>
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="max-h-[450px] overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent" />
          </div>
        ) : visibleNotifications.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
              <Bell size={28} className="text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-900 mb-1">알림이 없습니다</p>
            <p className="text-xs text-gray-500">
              새로운 알림이 도착하면 여기에 표시됩니다
            </p>
          </div>
        ) : (
          <>
            <ul className="divide-y divide-gray-100">
              {visibleNotifications.map((notification) => {
                const unread = !notification.is_read;
                return (
                  <li key={notification.id} className="w-full">
                    <div
                      className={[
                        "flex items-start gap-3 p-4 transition-all alert-item-hover",
                        unread ? "bg-blue-50/60 hover:bg-blue-100/60" : "bg-white hover:bg-gray-50",
                      ].join(" ")}
                    >
                      <button
                        type="button"
                        onClick={() => handleItemClick(notification)}
                        className="flex-1 min-w-0 text-left"
                      >
                        <div className="text-[14px] font-black leading-tight text-slate-900">
                          {notification.title || "알림"}
                        </div>
                        <div className="text-[13px] mt-1 text-slate-600">
                          {notification.message}
                        </div>
                        <div className="mt-2 text-[11px] text-slate-400">
                          {notification.created_at
                            ? new Date(notification.created_at).toLocaleString("ko-KR")
                            : "-"}
                        </div>
                      </button>
                      <div className="flex flex-col gap-1 shrink-0">
                        {unread && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="p-1 text-green-500 hover:bg-green-50 rounded"
                            title="읽음"
                          >
                            <Check size={14} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteOne(notification.id)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded"
                          title="삭제"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            {visibleNotifications.length >= notifications.length && (
              <div className="select-none py-4 text-center text-[11px] text-gray-400 bg-gray-50">
                <p className="font-medium">추가로 표시할 알림이 없습니다</p>
                <p className="mt-1">알림은 최대 7일간 보관됩니다</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
