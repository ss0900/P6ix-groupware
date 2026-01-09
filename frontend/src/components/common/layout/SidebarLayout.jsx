// src/components/common/SidebarLayout.jsx
import React, { useRef, useState, useEffect } from "react";
import {
  NavLink,
  Outlet,
  useLocation,
  useParams,
  useNavigate,
} from "react-router-dom";

import {
  IoChevronForward,
  IoChevronBack,
  IoPersonOutline,
  IoLogOutOutline,
  IoFolderOpenOutline,
  IoFolderOutline,
} from "react-icons/io5";

// --- 재귀 아이템 컴포넌트 ---
function RecursiveItem({ item, basePath, linkCls, depth = 0 }) {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const hasChildren = item.items && item.items.length > 0;

  // 하위 경로 활성화 시 자동 펼침
  useEffect(() => {
    if (hasChildren) {
      const checkActive = (node) => {
        const path = buildTo(node.to);
        // Ensure pathStr is a string path
        const pathStr = typeof path === "object" ? path.pathname : path;
        if (!pathStr) return false;

        // Check self match (simple string match or startsWith)
        // Normalize paths: remove trailing slash, replace multiple slashes
        const normalize = (p) => p.replace(/\/+/g, "/").replace(/\/$/, "");
        const cleanPath = normalize(pathStr);
        const cleanLoc = normalize(location.pathname);

        if (cleanPath !== "#" && cleanLoc.startsWith(cleanPath)) {
          return true;
        }

        // Check children
        if (node.items) {
          return node.items.some((child) => checkActive(child));
        }
        return false;
      };

      if (checkActive(item)) {
        setIsOpen(true);
      }
    }
  }, [location.pathname, hasChildren, item, basePath]);

  const toggle = (e) => {
    if (hasChildren) {
      e.preventDefault();
      setIsOpen((prev) => !prev);
    }
  };

  const buildTo = (to) => {
    if (!to) return "#";
    if (typeof to === "string") return `${basePath}/${to}`;
    return { ...to, pathname: `${basePath}/${to.pathname}` };
  };

  const indent = depth * 12 + 12; // 들여쓰기

  if (hasChildren) {
    return (
      <div className="flex flex-col">
        {item.to && item.to !== "#" ? (
          <NavLink
            to={buildTo(item.to)}
            end={item.end}
            onClick={(e) => {
              setIsOpen(true);
              if (item.onClick) item.onClick(e);
            }}
            className={({ isActive }) =>
              linkCls(isActive) +
              " flex items-center justify-between " +
              (item.className || "")
            }
            style={{ paddingLeft: `${indent}px` }}
          >
            <div className="flex items-center gap-2 min-w-0">
              {isOpen ? (
                <IoFolderOpenOutline className="flex-shrink-0" />
              ) : (
                <IoFolderOutline className="flex-shrink-0" />
              )}
              <span className="truncate">{item.label}</span>
            </div>
            <div
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggle(e);
              }}
              className="p-1 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-700 flex-shrink-0"
            >
              <IoChevronForward
                className={`w-3 h-3 transition-transform ${
                  isOpen ? "rotate-90" : ""
                }`}
              />
            </div>
          </NavLink>
        ) : (
          <button
            onClick={toggle}
            className={`flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition rounded-md w-full text-left`}
            style={{ paddingLeft: `${indent}px` }}
          >
            {isOpen ? (
              <IoFolderOpenOutline className="flex-shrink-0" />
            ) : (
              <IoFolderOutline className="flex-shrink-0" />
            )}
            <span className="flex-1 truncate">{item.label}</span>
            <IoChevronForward
              className={`w-3 h-3 transition-transform flex-shrink-0 ${
                isOpen ? "rotate-90" : ""
              }`}
            />
          </button>
        )}

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

  // Leaf node
  const handleLeafClick = (e) => {
    if (item.onClick) {
      e.preventDefault();
      item.onClick();
    }
    // Also support default NavLink behavior
  };

  return (
    <NavLink
      to={buildTo(item.to)}
      end={item.end}
      onClick={handleLeafClick}
      className={({ isActive }) =>
        linkCls(isActive) +
        " flex items-center gap-2 min-w-0 " +
        (item.className || "")
      }
      style={{ paddingLeft: `${indent}px` }}
    >
      {/* 아이콘이 데이터에 있다면 렌더링 */}
      {item.icon && <item.icon className="w-4 h-4 flex-shrink-0" />}
      <span className="truncate">{item.label}</span>
    </NavLink>
  );
}

// --- 섹션 컴포넌트 ---
function RecursiveSection({
  section,
  basePath,
  linkCls,
  openSection,
  setOpenSection,
  sidebarAnimating,
  sidebarCollapsed,
}) {
  const isOpen = openSection === section.title;

  return (
    <div className="rounded-lg bg-[#fafafa] border">
      <button
        disabled={sidebarAnimating}
        onClick={() => setOpenSection(isOpen ? null : section.title)}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 transition font-medium text-gray-800"
      >
        {!sidebarCollapsed && (
          <IoChevronForward
            className={`transition-transform duration-300 ${
              isOpen ? "rotate-90" : ""
            }`}
          />
        )}
        {!sidebarCollapsed && section.title}
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

export default function SidebarLayout({
  title,
  base,
  sections,
  isopen = false,
  enableToggle = false,
  noPadding = false,
}) {
  const safeSections = Array.isArray(sections) ? sections : [];
  const { id } = useParams(); // (groupware에서는 없어도 됨)
  const location = useLocation();
  const navigate = useNavigate();
  const basePath = typeof base === "function" ? base(id) : base;

  const [sidebarCollapsed, setSidebarCollapsed] = useState(isopen);
  const [sidebarAnimating, setSidebarAnimating] = useState(false);
  const [openSection, setOpenSection] = useState(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const sidebarRef = useRef(null);
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  // --- 권한 정리 ---
  const toBool = (v) => v === true || v === "true";
  const isStaff = toBool(user?.is_staff);
  const isSuperuser = toBool(user?.is_superuser);
  const permLevel = { isStaff: 2, isSuperuser: 3 };
  const currentLevel = isSuperuser ? 3 : isStaff ? 2 : 1;

  const hasPerm = (perm) => {
    if (!perm) return true;
    if (isSuperuser) return true;
    return currentLevel >= (permLevel[perm] || 0);
  };

  const filteredSections = safeSections
    .filter((section) => hasPerm(section.permission))
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => hasPerm(item.permission)),
    }))
    .filter((section) => section.items.length > 0);

  const buildTo = (to) => {
    if (typeof to === "string") return `${basePath}/${to}`;
    return { ...to, pathname: `${basePath}/${to.pathname}` };
  };

  const linkCls = (isActive) =>
    `block rounded-md px-3 py-2 text-sm transition-colors duration-200 ${
      isActive ? "bg-gray-700 text-white" : "text-gray-600 hover:bg-gray-200"
    }`;

  // 메뉴 클릭 시 해당 섹션 열어줌
  const handleMenuClick = (sectionTitle) => {
    setOpenSection(sectionTitle);
  };

  // URL 변경 시 최초 1회 자동 섹션 오픈
  useEffect(() => {
    const checkMatch = (items) => {
      return items.some((item) => {
        const path =
          typeof item.to === "string"
            ? `${basePath}/${item.to}`
            : item.to
            ? `${basePath}/${item.to.pathname}`
            : "";

        // Normalize paths
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
  }, [location.pathname, basePath]);

  const handleLogout = () => {
    if (window.confirm("정말 로그아웃 하시겠습니까?")) {
      localStorage.clear();
      navigate("/login");
    }
  };

  const toggleSidebar = () => {
    if (!enableToggle) return;

    setSidebarAnimating(true);
    setUserMenuOpen(false);
    setSidebarCollapsed((prev) => !prev);
    setTimeout(() => setSidebarAnimating(false), 300);
  };

  return (
    <div
      className="bg-[#f9fafb] min-h-[calc(100vh-60px)] md:h-[calc(100vh-60px)] flex relative md:overflow-hidden"
      style={{ maxWidth: "100vw", overflowX: "hidden" }}
    >
      <aside
        ref={sidebarRef}
        className={`hidden md:flex flex-col bg-white border-r transition-all duration-300 ${
          sidebarCollapsed ? "w-14" : "w-56"
        }`}
      >
        {/* USER MENU */}
        <div className="pt-4 pb-3 border-b flex flex-col gap-2 w-full">
          <button
            onClick={() => setUserMenuOpen((prev) => !prev)}
            className="flex items-center px-3 gap-2 hover:bg-gray-100 transition w-full"
          >
            <IoPersonOutline className="w-6 h-6 text-gray-700" />
            {!sidebarCollapsed && (
              <span className="font-semibold text-gray-800 flex-1 truncate">
                {user?.name}
              </span>
            )}
            {!sidebarCollapsed && (
              <span className="text-xs text-gray-500">{user?.email}</span>
            )}
          </button>

          {/* 유저 드롭다운 구분 강화 */}
          {!sidebarCollapsed && userMenuOpen && (
            <div className="bg-white shadow-md border rounded-md mx-2 mb-1 p-2 flex flex-col gap-1 animate-fadeIn">
              <button
                onClick={() => navigate(`${basePath}/user`)}
                className="px-2 py-1 rounded hover:bg-gray-100 text-left"
              >
                내 정보
              </button>
              <button
                onClick={() => navigate(`${basePath}/mypage`)}
                className="px-2 py-1 rounded hover:bg-gray-100 text-left"
              >
                마이페이지
              </button>
            </div>
          )}
        </div>

        {/* MENU */}
        <nav className="flex-1 px-2 py-3 space-y-2 overflow-y-auto">
          {filteredSections.map((section) => (
            <RecursiveSection
              key={section.title}
              section={section}
              basePath={basePath}
              linkCls={linkCls}
              openSection={openSection}
              setOpenSection={setOpenSection}
              sidebarAnimating={sidebarAnimating}
              sidebarCollapsed={sidebarCollapsed}
            />
          ))}
        </nav>

        {/* LOGOUT */}
        <div className="border-t p-2 w-full">
          <button
            onClick={handleLogout}
            className={`flex items-center gap-2 w-full py-2 rounded ${
              sidebarCollapsed ? "justify-center" : "px-2"
            } hover:bg-red-50 text-red-500`}
            title="로그아웃"
          >
            <IoLogOutOutline className="w-5 h-5" />
            {!sidebarCollapsed && <span>로그아웃</span>}
          </button>
        </div>
      </aside>

      {enableToggle && (
        <button
          onClick={toggleSidebar}
          className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 translate-x-full
            w-5 h-10 items-center justify-center hover:scale-110 transition text-gray-600"
        >
          {sidebarCollapsed ? <IoChevronForward /> : <IoChevronBack />}
        </button>
      )}

      <main
        className={`flex-1 md:overflow-auto md:h-full ${
          noPadding ? "p-0" : "p-4 md:p-6"
        }`}
        style={{
          minWidth: 0,
          maxWidth: "100vw",
          overflowX: "hidden",
          boxSizing: "border-box",
        }}
      >
        <Outlet />
      </main>
    </div>
  );
}
