// src/components/layout/Menu.jsx
import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import Dropdown from "./Dropdown";
import { projectMenus, menuOrder } from "./ProjectMenus";

function Menu() {
  const [openMenu, setOpenMenu] = useState(null);
  const { user } = useAuth();

  const hasPermission = (permission) => {
    if (!permission) return true;
    if (permission === "superuser") return Boolean(user?.is_superuser);
    if (permission === "staff") return Boolean(user?.is_staff || user?.is_superuser);
    return true;
  };

  const filterSectionsByPermission = (sections = []) =>
    sections
      .filter((section) => hasPermission(section.permission))
      .map((section) => ({
        ...section,
        items: (section.items || []).filter((item) => hasPermission(item.permission)),
      }))
      .filter((section) => section.items.length > 0);

  const toggleMenu = (menuName) => {
    setOpenMenu((prev) => (prev === menuName ? null : menuName));
  };

  return (
    <div className="flex items-center gap-5 justify-center text-center whitespace-nowrap">
      {menuOrder.map((key, index) => {
        // 관리자/영업관리는 staff 권한 필요
        if ((key === "operation" || key === "admin") && !(user?.is_staff || user?.is_superuser)) {
          return null;
        }

        const menu = projectMenus[key];
        if (!menu) return null;

        const filteredSections = filterSectionsByPermission(menu.sections);
        if ((menu.sections?.length ?? 0) > 0 && filteredSections.length === 0) {
          return null;
        }

        const firstAllowedTo = filteredSections[0]?.items?.[0]?.to;
        const menuForUser = {
          ...menu,
          sections: filteredSections,
          baseClick: firstAllowedTo || menu.baseClick,
        };
        
        return (
          <Dropdown
            key={key}
            menuKey={key}
            menu={menuForUser}
            toggleMenu={toggleMenu}
            openMenu={openMenu}
            isLast={index >= menuOrder.length - 2}
          />
        );
      })}
    </div>
  );
}

export default Menu;
