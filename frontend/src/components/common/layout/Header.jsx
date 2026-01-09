import React from "react";
import { useNavigate } from "react-router-dom";

function Header() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const username = user?.username ?? "";

  const goHome = () => navigate("/system");
  const logout = () => {
    localStorage.clear();
    navigate("/login");
  };

  return (
    <nav className="w-full border-b bg-white">
      <div className="w-full px-6 py-3 flex items-center">
        <button onClick={goHome} className="text-lg font-bold">
          p6ix 그룹웨어
        </button>
        <div className="flex-1" />
        <div className="flex items-center gap-3">
          {username ? (
            <span className="text-sm text-gray-600">{username}</span>
          ) : null}
          <button onClick={logout} className="text-sm px-3 py-1 border rounded">
            로그아웃
          </button>
        </div>
      </div>
    </nav>
  );
}

export default Header;
