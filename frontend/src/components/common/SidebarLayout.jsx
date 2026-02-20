// src/components/common/SidebarLayout.jsx
import React, { useMemo, useState, useEffect } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { ChevronRight, ChevronLeft, User, LogOut } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";

function RecursiveItem({ item, basePath, linkCls, depth = 0 }) {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const hasChildren = item.items && item.items.length > 0;

  const buildTo = (to) => {
    if (!to) return "#";
    if (typeof to === "string") {
      const path = `${basePath}/${to}`.replace(/\/+/g, "/");
      return path;
    }
    return { ...to, pathname: `${basePath}/${to.pathname}` };
  };

  // 하위 경로 활성화 시 자동 펼침
  useEffect(() => {
    if (hasChildren) {
      const checkActive = (node) => {
        const path = buildTo(node.to);
        const pathStr = typeof path === "object" ? path.pathname : path;
        if (!pathStr || pathStr === "#") return false;

        const normalize = (p) => p.replace(/\/+/g, "/").replace(/\/$/, "");
        const cleanPath = normalize(pathStr);
        const cleanLoc = normalize(location.pathname);

        if (cleanLoc.startsWith(cleanPath)) return true;
        if (node.items) return node.items.some((child) => checkActive(child));
        return false;
      };

      if (checkActive(item)) setIsOpen(true);
    }
  }, [location.pathname, hasChildren, item, basePath]);

  const toggle = (e) => {
    if (hasChildren) {
      e.preventDefault();
      setIsOpen((prev) => !prev);
    }
  };

  const indent = depth * 12 + 12;

  if (hasChildren) {
    return (
      <div className="flex flex-col">
        <button
          onClick={toggle}
          className="flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition rounded-md w-full text-left"
          style={{ paddingLeft: `${indent}px` }}
        >
          <span className="flex-1 truncate">{item.label}</span>
          <ChevronRight
            className={`w-4 h-4 transition-transform ${isOpen ? "rotate-90" : ""}`}
          />
        </button>

        {isOpen && (
          <div className="flex flex-col space-y-1">
            {item.items.map((child, idx) => (
              <RecursiveItem
                key={idx}
                item={child}
                basePath={basePath}
                linkCls={linkCls}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (item.onClick) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          item.onClick(e);
        }}
        className={`${linkCls(false)} flex items-center gap-2 min-w-0 w-full text-left ${item.className || ""}`}
        style={{ paddingLeft: `${indent}px` }}
      >
        {item.icon && <item.icon size={16} />}
        <span className="truncate">{item.label}</span>
      </button>
    );
  }

  return (
    <NavLink
      to={buildTo(item.to)}
      end={item.end}
      className={({ isActive }) =>
        linkCls(isActive) + ` flex items-center gap-2 min-w-0 ${item.className || ""}`
      }
      style={{ paddingLeft: `${indent}px` }}
    >
      {item.icon && <item.icon size={16} />}
      <span className="truncate">{item.label}</span>
    </NavLink>
  );
}

function RecursiveSection({
  section,
  basePath,
  linkCls,
  openSection,
  setOpenSection,
}) {
  const isOpen = openSection === section.title;

  return (
    <div className="rounded-lg bg-gray-50 border">
      <button
        onClick={() => setOpenSection(isOpen ? null : section.title)}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 transition font-medium text-gray-800"
      >
        <ChevronRight
          className={`w-4 h-4 transition-transform ${isOpen ? "rotate-90" : ""}`}
        />
        {section.title}
      </button>

      <div
        className={`overflow-hidden transition-all duration-300 ${
          isOpen ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="flex flex-col py-1 pr-2 space-y-1">
          {section.items.map((item, idx) => (
            <RecursiveItem
              key={idx}
              item={item}
              basePath={basePath}
              linkCls={linkCls}
              depth={0}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function SidebarLayout({ title, base, sections = [], enableToggle = false, defaultCollapsed = false }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const basePath = base || "";
  const [openSection, setOpenSection] = useState(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(defaultCollapsed);

  const hasPermission = useMemo(
    () => (permission) => {
      if (!permission) return true;
      if (permission === "superuser") return Boolean(user?.is_superuser);
      if (permission === "staff") return Boolean(user?.is_staff || user?.is_superuser);
      return true;
    },
    [user?.is_staff, user?.is_superuser],
  );

  const filteredSections = useMemo(
    () =>
      sections
        .filter((section) => hasPermission(section.permission))
        .map((section) => ({
          ...section,
          items: (section.items || []).filter((item) => hasPermission(item.permission)),
        }))
        .filter((section) => section.items.length > 0),
    [sections, hasPermission],
  );

  const linkCls = (isActive) =>
    `block rounded-md px-3 py-2 text-sm transition-colors duration-200 ${
      isActive ? "bg-gray-700 text-white" : "text-gray-600 hover:bg-gray-200"
    }`;

  // URL 변경 시 자동 섹션 오픈
  useEffect(() => {
    const checkMatch = (items) => {
      return items.some((item) => {
        const path =
          typeof item.to === "string"
            ? `${basePath}/${item.to}`.replace(/\/+/g, "/")
            : item.to
            ? `${basePath}/${item.to.pathname}`
            : "";

        const normalize = (p) => p.replace(/\/+/g, "/").replace(/\/$/, "");
        const cleanPath = normalize(path);
        const cleanLoc = normalize(location.pathname);

        if (path && cleanPath !== "#" && cleanLoc.startsWith(cleanPath)) {
          return true;
        }

        if (item.items && item.items.length > 0) {
          return checkMatch(item.items);
        }
        return false;
      });
    };

    filteredSections.forEach((section) => {
      if (checkMatch(section.items)) {
        setOpenSection(section.title);
      }
    });
  }, [location.pathname, basePath, filteredSections]);

  const handleLogout = async () => {
    if (window.confirm("정말 로그아웃 하시겠습니까?")) {
      await logout();
      navigate("/login");
    }
  };

  // sections가 비어있으면 사이드바 없이 렌더링
  if (!filteredSections || filteredSections.length === 0) {
    return (
      <div className="bg-gray-50 h-[calc(100dvh-60px)]">
        <main className="h-full p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 h-[calc(100dvh-60px)] flex relative overflow-hidden">
      {/* Sidebar */}
      <aside className={`hidden lg:flex flex-col bg-white border-r shrink-0 transition-all duration-300 ${
        sidebarCollapsed ? "w-14" : "w-56"
      }`}>
        {/* User Section */}
        <div className="pt-4 pb-3 border-b flex flex-col gap-2 w-full">
          <button
            onClick={() => setUserMenuOpen((prev) => !prev)}
            className="flex items-center px-3 gap-2 hover:bg-gray-100 transition w-full"
          >
            <User className="w-6 h-6 text-gray-700 shrink-0" />
            {!sidebarCollapsed && (
              <span className="font-semibold text-gray-800 flex-1 truncate text-left">
                {user?.last_name}{user?.first_name || user?.username}
              </span>
            )}
          </button>

          {!sidebarCollapsed && userMenuOpen && (
            <div className="bg-white shadow-md border rounded-md mx-2 mb-1 p-2 flex flex-col gap-1">
              <button
                onClick={() => navigate("/my-info")}
                className="px-2 py-1 rounded hover:bg-gray-100 text-left text-sm"
              >
                내 정보
              </button>
              <button
                onClick={() => navigate("/my-page")}
                className="px-2 py-1 rounded hover:bg-gray-100 text-left text-sm"
              >
                마이페이지
              </button>
            </div>
          )}
        </div>

        {/* Menu Sections */}
        {!sidebarCollapsed && (
          <nav className="flex-1 px-2 py-3 space-y-2 overflow-y-auto">
            {filteredSections.map((section) => (
              <RecursiveSection
                key={section.title}
                section={section}
                basePath={basePath}
                linkCls={linkCls}
                openSection={openSection}
                setOpenSection={setOpenSection}
              />
            ))}
          </nav>
        )}

        {/* Logout */}
        <div className="border-t p-2 w-full mt-auto">
          <button
            onClick={handleLogout}
            className={`flex items-center gap-2 w-full py-2 rounded hover:bg-red-50 text-red-500 ${
              sidebarCollapsed ? "justify-center px-0" : "px-2"
            }`}
            title="로그아웃"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {!sidebarCollapsed && <span>로그아웃</span>}
          </button>
        </div>
      </aside>

      {/* Toggle Button */}
      {enableToggle && (
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="hidden lg:flex absolute top-1/2 -translate-y-1/2 z-10 w-5 h-10 items-center justify-center bg-white border border-gray-200 rounded-r-md shadow-sm hover:bg-gray-50 transition text-gray-500 hover:text-gray-700"
          style={{ left: sidebarCollapsed ? "56px" : "224px" }}
          title={sidebarCollapsed ? "사이드바 펼치기" : "사이드바 접기"}
        >
          {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      )}

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-y-auto min-h-0">
        <Outlet />
      </main>
    </div>
  );
}
