// src/components/layout/Sidebar.jsx
// ProjectMenus.jsx 데이터를 사용하는 모바일 사이드바
import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FileCheck,
  MessageSquare,
  Calendar,
  FolderOpen,
  Settings,
  ChevronDown,
  ChevronRight,
  Building,
  History,
  Briefcase,
  Mail,
  FolderKanban,
} from "lucide-react";
import { projectMenus, menuOrder } from "./ProjectMenus";

// 메뉴별 아이콘 매핑
const menuIcons = {
  dashboard: LayoutDashboard,
  timeline: History,
  approval: FileCheck,
  board: MessageSquare,
  schedule: Calendar,
  archive: FolderOpen,
  operation: Briefcase,
  contact: Mail,
  project: FolderKanban,
  admin: Settings,
};

function Sidebar({ isOpen, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [expandedMenus, setExpandedMenus] = useState(menuOrder);

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
    onClose?.();
  };

  // ProjectMenus 데이터를 기반으로 메뉴 아이템 생성
  const menuItems = menuOrder.map((menuKey) => {
    const menu = projectMenus[menuKey];
    if (!menu) return null;

    const Icon = menuIcons[menuKey] || LayoutDashboard;

    // 하위 항목들 플랫하게 펼치기
    const children = menu.sections.flatMap((section) =>
      section.items.map((item) => ({
        id: `${menuKey}-${item.to}`,
        label: item.label,
        path: item.to ? `${menu.base}/${item.to}` : menu.base,
      }))
    );

    // 단일 항목만 있으면 children 없이 직접 경로 지정
    if (children.length === 1) {
      return {
        id: menuKey,
        label: menu.title,
        icon: Icon,
        path: children[0].path,
      };
    }

    return {
      id: menuKey,
      label: menu.title,
      icon: Icon,
      children,
    };
  }).filter(Boolean);

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
