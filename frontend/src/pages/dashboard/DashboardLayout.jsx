// src/pages/dashboard/DashboardLayout.jsx
import SidebarLayout from "../../components/common/SidebarLayout";
import { projectMenus } from "../../components/layout/ProjectMenus";

export default function DashboardLayout() {
  return (
    <SidebarLayout
      title="대시보드"
      base={projectMenus.dashboard.base}
      sections={projectMenus.dashboard.sections}
      enableToggle={true}
      defaultCollapsed={true}
    />
  );
}
