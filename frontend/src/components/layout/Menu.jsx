// src/components/layout/Menu.jsx
import { useState } from "react";
import Dropdown from "./Dropdown";
import { projectMenus, menuOrder } from "./ProjectMenus";

function Menu() {
  const [openMenu, setOpenMenu] = useState(null);

  const toggleMenu = (menuName) => {
    setOpenMenu((prev) => (prev === menuName ? null : menuName));
  };

  return (
    <div className="flex items-center gap-5 justify-center text-center whitespace-nowrap">
      {menuOrder.map((key, index) => {
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
