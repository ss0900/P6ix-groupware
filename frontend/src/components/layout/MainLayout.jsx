// src/components/layout/MainLayout.jsx
import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import Header from "./Header";
import Sidebar from "./Sidebar";

function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Top Menu */}
      <Header onMenuClick={toggleSidebar} />

      {/* Mobile Sidebar (only visible on small screens when toggled) */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content - no left margin on desktop since we use top menu */}
      <main className="lg:ml-0">
        <Outlet />
      </main>
    </div>
  );
}

export default MainLayout;

