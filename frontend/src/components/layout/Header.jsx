// src/components/layout/Header.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Menu as MenuIcon, Bell, MessageSquare, HelpCircle, User, LogOut, ChevronDown } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import api from "../../api/axios";

// 컴포넌트
import ChatPanel from "../chat/ChatPanel";
import NotificationPanel from "../notification/NotificationPanel";
import Menu from "./Menu";

function Header({ onMenuClick }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  // 알림 개수 로드
  useEffect(() => {
    const loadUnreadCount = async () => {
      try {
        const res = await api.get("chat/notifications/unread_count/");
        setUnreadNotifications(res.data.count || 0);
      } catch (err) {
        console.error(err);
      }
    };
    loadUnreadCount();
    // 30초마다 갱신
    const interval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const goDashboard = () => {
    navigate("/");
  };

  const goHelp = () => {
    navigate("/help");
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-[#1e1e2f] shadow-md">
        <div className="w-full px-6 py-3 flex items-center">
          {/* Left Section - Logo */}
          <div className="flex items-center gap-4 shrink-0">
            <button
              onClick={onMenuClick}
              className="p-2 rounded-lg hover:bg-slate-700 text-white transition-colors lg:hidden"
            >
              <MenuIcon size={20} />
            </button>

            <button
              onClick={goDashboard}
              className="text-white font-bold text-xl hover:opacity-90 transition-opacity whitespace-nowrap"
            >
              P6ix Groupware
            </button>
          </div>

          {/* Center Section - Top Menu */}
          <div className="flex-1 flex justify-center px-8 hidden lg:flex">
            <Menu />
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-2">
            {/* 알림 */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  setShowChat(false);
                }}
                className="relative p-2 rounded-lg hover:bg-slate-700 text-white transition-colors"
                title="알림"
              >
                <Bell size={20} />
                {unreadNotifications > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                    {unreadNotifications}
                  </span>
                )}
              </button>

              {/* 알림 패널 */}
              <NotificationPanel isOpen={showNotifications} onClose={() => setShowNotifications(false)} />
            </div>

            {/* 메신저 */}
            <button
              onClick={() => {
                setShowChat(!showChat);
                setShowNotifications(false);
              }}
              className="p-2 rounded-lg hover:bg-slate-700 text-white transition-colors"
              title="메신저"
            >
              <MessageSquare size={20} />
            </button>

            {/* 도움말 */}
            <button
              onClick={goHelp}
              className="p-2 rounded-lg hover:bg-slate-700 text-white transition-colors"
              title="도움말"
            >
              <HelpCircle size={20} />
            </button>

            {/* User Menu */}
            <div className="relative ml-2">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-700 text-white transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                  <User size={16} />
                </div>
                <span className="text-sm font-medium hidden sm:block">
                  {user?.username || "사용자"}
                </span>
                <ChevronDown size={16} className={`transition-transform ${showUserMenu ? "rotate-180" : ""}`} />
              </button>

              {showUserMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowUserMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">{user?.username}</p>
                      <p className="text-xs text-gray-500">{user?.email}</p>
                    </div>
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        navigate("/my-info");
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <User size={16} />
                      내 정보
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <LogOut size={16} />
                      로그아웃
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 채팅 패널 */}
      <ChatPanel isOpen={showChat} onClose={() => setShowChat(false)} />
    </>
  );
}

export default Header;
