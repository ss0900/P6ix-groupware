// src/components/layout/Dropdown.jsx
import { useNavigate, useLocation } from "react-router-dom";

export default function Dropdown({
  menuKey,
  menu,
  toggleMenu,
  openMenu,
  isLast,
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const base = menu.base || "";
  const sections = menu.sections ?? [];

  // 메뉴 클릭 시 기본 경로로 이동
  const handleBaseClick = () => {
    if (menu.path) {
      navigate(menu.path);
    } else if (menu.baseClick) {
      navigate(`${base}/${menu.baseClick}`);
    } else {
      navigate(base);
    }
    toggleMenu(null);
  };

  // 현재 경로가 이 메뉴에 해당하는지 체크
  const isActive = () => {
    const path = location.pathname;
    
    // 대시보드는 "/" 또는 "/main"만 매칭
    if (base === "/" || base === "") {
      return path === "/" || path === "/main";
    }
    
    if (menu.path) {
      return path.startsWith(menu.path);
    }
    
    return base && path.startsWith(base);
  };

  return (
    <div
      className="menu-root relative"
      onMouseEnter={() => toggleMenu(menuKey)}
      onMouseLeave={() => toggleMenu(null)}
    >
      {/* 상단 메뉴 탭 */}
      <span
        className={`menu-trigger cursor-pointer transition-colors ${
          isActive() ? "text-blue-400 font-semibold" : "text-white hover:text-blue-300"
        }`}
        onClick={handleBaseClick}
      >
        {menu.title}
      </span>

      {/* 드롭다운 패널 */}
      {openMenu === menuKey && sections.length > 0 && (
        <div
          className="menu-panel absolute top-full bg-white border border-gray-200 shadow-lg min-w-40 text-black z-50 py-2 left-1/2 -translate-x-1/2"
        >
          {sections.map((section, idx) => {
            const firstItem = section.items?.[0];
            if (!firstItem) return null;

            const to = typeof firstItem.to === "string"
              ? `${base}/${firstItem.to}`.replace(/\/+/g, "/")
              : base;

            return (
              <div
                key={idx}
                className="menu-item px-3 py-2 cursor-pointer hover:bg-gray-100 text-sm whitespace-nowrap"
                onClick={() => {
                  navigate(to);
                  toggleMenu(null);
                }}
              >
                {section.title}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
