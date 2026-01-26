// src/components/layout/Menu.jsx
import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import Dropdown from "./Dropdown";
import { projectMenus, menuOrder } from "./ProjectMenus";

function Menu() {
  const [openMenu, setOpenMenu] = useState(null);
  const { user } = useAuth();

  const toggleMenu = (menuName) => {
    setOpenMenu((prev) => (prev === menuName ? null : menuName));
  };

  return (
    <div className="flex items-center gap-5 justify-center text-center whitespace-nowrap">
      {menuOrder.map((key, index) => {
        // 관리자/영업관리는 staff 권한 필요
        if ((key === "operation" || key === "admin") && !user?.is_staff) {
          return null;
        }

        const menu = projectMenus[key];
        if (!menu) return null;
        
        return (
          <Dropdown
            key={key}
            menuKey={key}
            menu={menu}
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
