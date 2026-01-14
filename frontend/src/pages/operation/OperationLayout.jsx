// src/pages/operation/OperationLayout.jsx
/**
 * 영업관리 모듈 레이아웃 - 사이드바 포함
 */
import React from "react";
import { Outlet, NavLink, useLocation } from "react-router-dom";
import {
  FiUsers,
  FiTarget,
  FiTrello,
  FiInbox,
  FiCalendar,
  FiFileText,
  FiLayers,
} from "react-icons/fi";

const menuItems = [
  {
    path: "/operation/sales/leads",
    label: "영업기회",
    icon: FiTarget,
  },
  {
    path: "/operation/sales/pipeline",
    label: "파이프라인",
    icon: FiTrello,
  },
  {
    path: "/operation/sales/inbox",
    label: "영업접수",
    icon: FiInbox,
  },
  {
    path: "/operation/sales/todo",
    label: "TODO 캘린더",
    icon: FiCalendar,
  },
  {
    path: "/operation/sales/customers",
    label: "고객관리",
    icon: FiUsers,
  },
  {
    path: "/operation/sales/quotes",
    label: "견적서",
    icon: FiFileText,
  },
  {
    path: "/operation/sales/templates",
    label: "견적 템플릿",
    icon: FiLayers,
  },
];

function OperationLayout() {
  const location = useLocation();

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <aside className="sidebar p-4">
        <h2 className="text-lg font-bold text-gray-800 mb-6 px-2">영업관리</h2>
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`sidebar-menu-item ${isActive ? "active" : ""}`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="main-content flex-1 p-6 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}

export default OperationLayout;
