// src/pages/admin/AdminLayout.jsx
import SidebarLayout from "../../components/common/SidebarLayout";
import { projectMenus } from "../../components/layout/ProjectMenus";

export default function AdminLayout() {
  return (
    <SidebarLayout
      title="관리자"
      base={projectMenus.admin.base}
      sections={projectMenus.admin.sections}
    />
  );
}
