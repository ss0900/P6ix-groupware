// src/pages/archive/ArchiveLayout.jsx
import SidebarLayout from "../../components/common/SidebarLayout";
import { projectMenus } from "../../components/layout/ProjectMenus";

export default function ArchiveLayout() {
  return (
    <SidebarLayout
      title="자료실"
      base={projectMenus.archive.base}
      sections={projectMenus.archive.sections}
    />
  );
}
