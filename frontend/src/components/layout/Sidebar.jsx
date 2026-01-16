// src/components/layout/Sidebar.jsx
import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FileCheck,
  MessageSquare as Board,
  Calendar,
  FolderOpen,

  Settings,
  ChevronDown,
  ChevronRight,
  Building,
  History,
} from "lucide-react";

const menuItems = [
  {
    id: "dashboard",
    label: "대시보드",
    icon: LayoutDashboard,
    path: "/",
  },
  {
    id: "timeline",
    label: "타임라인",
    icon: History,
    path: "/timeline",
  },
  {
    id: "approval",
    label: "전자결재",
    icon: FileCheck,
    children: [
      { id: "approval-inbox", label: "결재함", path: "/approval" },
      { id: "approval-draft", label: "기안함", path: "/approval/draft" },
      { id: "approval-settings", label: "환경설정", path: "/approval/settings" },
    ],
  },
  {
    id: "board",
    label: "게시판",
    icon: Board,
    children: [
      { id: "board-notice", label: "공지사항", path: "/board/notice" },
      { id: "board-list", label: "게시판", path: "/board" },
    ],
  },
  {
    id: "schedule",
    label: "회의∙일정",
    icon: Calendar,
    children: [
      { id: "schedule-calendar", label: "캘린더", path: "/schedule/calendar" },
      { id: "schedule-resources", label: "자원 예약", path: "/schedule/resources" },
    ],
  },
  {
    id: "archive",
    label: "자료실",
    icon: FolderOpen,
    path: "/archive",
  },

  {
    id: "admin",
    label: "관리자",
    icon: Settings,
    children: [
      { id: "admin-users", label: "사용자 관리", path: "/admin/users" },
      { id: "admin-org", label: "조직도 관리", path: "/admin/organization" },
      { id: "admin-positions", label: "직위 관리", path: "/admin/positions" },
    ],
  },
];

function Sidebar({ isOpen, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [expandedMenus, setExpandedMenus] = useState(["approval", "board", "schedule", "admin"]);

  const toggleMenu = (menuId) => {
    setExpandedMenus((prev) =>
      prev.includes(menuId)
        ? prev.filter((id) => id !== menuId)
        : [...prev, menuId]
    );
  };

  const isActive = (path) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  const handleNavigate = (path) => {
    navigate(path);
  };

  return (
    <>
      {/* Overlay (mobile) */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-[60px] left-0 h-[calc(100vh-60px)] w-64 bg-white border-r border-gray-200 z-40 transition-transform duration-300 overflow-y-auto ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <nav className="py-4">
          {menuItems.map((item) => (
            <div key={item.id}>
              {/* Parent Menu Item */}
              <button
                onClick={() =>
                  item.children ? toggleMenu(item.id) : handleNavigate(item.path)
                }
                className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-colors ${
                  item.path && isActive(item.path)
                    ? "bg-blue-50 text-blue-700 font-medium border-r-2 border-blue-600"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon size={18} />
                  <span>{item.label}</span>
                </div>
                {item.children && (
                  <span className="text-gray-400">
                    {expandedMenus.includes(item.id) ? (
                      <ChevronDown size={16} />
                    ) : (
                      <ChevronRight size={16} />
                    )}
                  </span>
                )}
              </button>

              {/* Child Menu Items */}
              {item.children && expandedMenus.includes(item.id) && (
                <div className="bg-gray-50">
                  {item.children.map((child) => (
                    <button
                      key={child.id}
                      onClick={() => handleNavigate(child.path)}
                      className={`w-full flex items-center pl-12 pr-4 py-2.5 text-sm transition-colors ${
                        isActive(child.path)
                          ? "bg-blue-50 text-blue-700 font-medium"
                          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                      }`}
                    >
                      {child.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-white">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Building size={14} />
            <span>P6ix Groupware v1.0</span>
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
