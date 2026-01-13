// src/pages/sales/SalesLayout.jsx
import SidebarLayout from "../../components/common/SidebarLayout";
import { projectMenus } from "../../components/layout/ProjectMenus";

export default function SalesLayout() {
  return (
    <SidebarLayout
      title="영업관리"
      base={projectMenus.sales.base}
      sections={projectMenus.sales.sections}
    />
  );
}
