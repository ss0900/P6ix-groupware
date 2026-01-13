// src/pages/approval/ApprovalLayout.jsx
import SidebarLayout from "../../components/common/SidebarLayout";
import { projectMenus } from "../../components/layout/ProjectMenus";

export default function ApprovalLayout() {
  return (
    <SidebarLayout
      title="전자결재"
      base={projectMenus.approval.base}
      sections={projectMenus.approval.sections}
    />
  );
}
