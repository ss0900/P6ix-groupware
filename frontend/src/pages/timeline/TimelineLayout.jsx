// src/pages/timeline/TimelineLayout.jsx
import SidebarLayout from "../../components/common/SidebarLayout";
import { projectMenus } from "../../components/layout/ProjectMenus";

export default function TimelineLayout() {
  return (
    <SidebarLayout
      title="타임라인"
      base={projectMenus.timeline.base}
      sections={projectMenus.timeline.sections}
    />
  );
}
