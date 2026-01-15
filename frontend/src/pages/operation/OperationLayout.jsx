// src/pages/operation/OperationLayout.jsx
import SidebarLayout from "../../components/common/SidebarLayout";
import { projectMenus } from "../../components/layout/ProjectMenus";

export default function OperationLayout() {
  return (
    <SidebarLayout
      title="영업관리"
      base={projectMenus.operation.base}
      sections={projectMenus.operation.sections}
    />
  );
}
